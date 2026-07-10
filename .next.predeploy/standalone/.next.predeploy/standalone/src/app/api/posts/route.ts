import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { LIMITS, sanitizeImageUrl } from "@/lib/validation"
import { checkAndGrantAchievements } from "@/lib/achievements"
import { POST_BASE_JOINS, postColumns, authJoins, inflateTags } from "@/lib/feed/post-projection"
import { rankForYou } from "@/lib/feed/ranking"
import { v4 as uuid } from "uuid"

function normalizeTags(input: unknown, fallback?: unknown) {
  const raw = [
    ...(Array.isArray(input) ? input : []),
    ...(typeof fallback === "string" ? fallback.split(",") : []),
  ]

  const seen = new Set<string>()
  return raw
    .map((tag) => String(tag).replace(/^#+/, "").trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 32))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const requestedLimit = parseInt(searchParams.get("limit") || "20")
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20
  const offset = (page - 1) * limit
  const sort = searchParams.get("sort") || "new"
  const tag = searchParams.get("tag")
  const q = searchParams.get("q")?.trim()
  const community = searchParams.get("community")
  const feed = searchParams.get("feed")
  const team = searchParams.get("team")
  const auth = await getAuthUser()

  const db = getDb()

  // "N new posts" pill: count posts newer than the client's last-seen timestamp.
  const since = searchParams.get("since")
  const newSince = since
    ? (await db.get<{ c: number }>(
        "SELECT COUNT(*) as c FROM posts p WHERE p.deleted = 0 AND p.created_at > ? AND EXISTS (SELECT 1 FROM users a WHERE a.id = p.user_id AND a.banned = 0)",
        [since]
      ))!.c
    : undefined

  if (feed === "foryou") {
    const ranked = await rankForYou(db, auth?.userId ?? null, page, limit)
    return apiResponse({ posts: ranked.posts, total: ranked.total, page, limit, ...(newSince !== undefined ? { new_since: newSince } : {}) })
  }

  let orderBy = "p.created_at DESC"
  if (sort === "top") orderBy = "COALESCE(vu.upvotes, 0) - COALESCE(vd.downvotes, 0) DESC, p.created_at DESC"

  let whereClause = "p.deleted = 0 AND EXISTS (SELECT 1 FROM users a WHERE a.id = p.user_id AND a.banned = 0)"
  const params: unknown[] = []

  if (tag) {
    whereClause += " AND EXISTS (SELECT 1 FROM post_tags pt2 WHERE pt2.post_id = p.id AND pt2.tag = ?)"
    params.push(tag)
  }
  if (community) {
    whereClause += " AND EXISTS (SELECT 1 FROM community_posts cp WHERE cp.post_id = p.id AND cp.community_id = ?)"
    params.push(community)
  }
  if (team) {
    whereClause += " AND u.team = ?"
    params.push(team)
  }

  if (q) {
    whereClause += " AND p.fts @@ plainto_tsquery('russian', ?)"
    params.push(q)
  }

  // Paste counter + view count.
  const total = (await db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM posts p JOIN users u ON u.id = p.user_id WHERE ${whereClause}`, params
  ))!.c

  const authJoinsStr = auth ? authJoins(true) : ""
  const authParams = auth ? [auth.userId, auth.userId] : []

  const posts = (await db.all(
    `SELECT ${postColumns(!!auth)} ${POST_BASE_JOINS} ${authJoinsStr} WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...authParams, ...params, limit, offset]
  )).map((r) => inflateTags(r as Record<string, unknown>))

  return apiResponse({
    posts,
    total,
    page,
    limit,
    ...(newSince !== undefined ? { new_since: newSince } : {}),
  })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const limited = rateLimitGuard(req, "post", 60, 10 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => null) as {
    title?: string; content?: string; tag?: string; image?: string; tags?: unknown
    communityId?: string; asCommunity?: boolean; anonymous?: boolean
  } | null

  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const tags = normalizeTags(body?.tags, body?.tag)

  if (!title) return apiError("Заголовок обязателен")
  if (title.length > LIMITS.postTitleMax) return apiError(`Заголовок должен быть короче ${LIMITS.postTitleMax} символов`)
  if (content.length > LIMITS.postContentMax) return apiError(`Текст должен быть короче ${LIMITS.postContentMax} символов`)

  const image = sanitizeImageUrl(body?.image)

  const db = getDb()

  // Community wall post — redirect to the community submission pipeline.
  if (body?.communityId) {
    const community = await db.get("SELECT id FROM communities WHERE id = ?", [body.communityId]) as { id: string } | undefined
    if (!community) return apiError("Паблик не найден", 404)

    // Determine role for auto-approval.
    const siteRole = (await db.get("SELECT role FROM users WHERE id = ?", [auth.userId]) as { role?: string } | undefined)?.role
    const isOwner = (await db.get("SELECT 1 FROM communities WHERE id = ? AND created_by = ?", [community.id, auth.userId])) ? true : false
    const isMod = (await db.get("SELECT 1 FROM community_moderators WHERE community_id = ? AND user_id = ?", [community.id, auth.userId])) ? true : false
    const canAutoApprove = siteRole === "admin" || isOwner || isMod

    if (canAutoApprove) {
      const { publishToWall } = await import("@/lib/communities")
      const postId = await publishToWall(db, {
        communityId: community.id,
        authorId: auth.userId,
        title,
        content,
        image,
        tags,
        asCommunity: body?.asCommunity !== false,
        anonymous: body?.anonymous === true,
      })
      return apiResponse({ postId }, 201)
    }

    // Regular user → suggestion queue.
    const id = uuid()
    await db.run(
      "INSERT INTO community_submissions (id, community_id, author_id, title, content, image, tags, as_community, anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, community.id, auth.userId, title, content, image, JSON.stringify(tags), body?.asCommunity !== false ? 1 : 0, body?.anonymous === true ? 1 : 0]
    )
    return apiResponse({ status: "queued" }, 201)
  }

  // Regular user post.
  const id = uuid()
  await db.transaction(async (tx) => {
    await tx.run(
      "INSERT INTO posts (id, user_id, title, content, tag, image) VALUES (?, ?, ?, ?, ?, ?)",
      [id, auth.userId, title, content, tags[0] || null, image || null]
    )
    for (let i = 0; i < tags.length; i++) {
      await tx.run(
        "INSERT INTO post_tags (post_id, tag, position) VALUES (?, ?, ?) ON CONFLICT (post_id, tag) DO NOTHING",
        [id, tags[i], i]
      )
    }
  })

  await checkAndGrantAchievements(db, auth.userId)

  return apiResponse({ postId: id }, 201)
}