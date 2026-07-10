import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { getCommunityBySlug, getCommunityRole, canModerate, normalizeTags, publishToWall } from "@/lib/communities"
import { LIMITS, sanitizeImageUrl } from "@/lib/validation"
import { rateLimitGuard } from "@/lib/rate-limit"
import { v4 as uuid } from "uuid"

// Editors: list the pending suggestion queue.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const { slug } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const siteRole = (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role
  const role = await getCommunityRole(db, community.id, community.created_by, auth.userId, siteRole)
  if (!canModerate(role)) return apiError("Только редакторы видят предложку", 403)

  const submissions = await db.all(`
    SELECT s.id, s.title, s.content, s.image, s.tags, s.as_community, s.created_at,
      u.id as author_id, u.username as author_username, u.team as author_team, u.driver as author_driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as author_avatar
    FROM community_submissions s
    JOIN users u ON u.id = s.author_id
    WHERE s.community_id = ? AND s.status = 'pending'
    ORDER BY s.created_at ASC
  `, [community.id])

  return apiResponse({ submissions })
}

// Suggest a post (members) — or publish straight to the wall (editors).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const limited = rateLimitGuard(req, "community-submit", 20, 60 * 60 * 1000)
  if (limited) return limited

  const { slug } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const body = await req.json().catch(() => null) as {
    title?: string; content?: string; image?: string; tags?: unknown; asCommunity?: boolean; anonymous?: boolean
  } | null
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  if (!title) return apiError("Заголовок обязателен")
  if (title.length > LIMITS.postTitleMax) return apiError(`Заголовок должен быть короче ${LIMITS.postTitleMax} символов`)
  if (content.length > LIMITS.postContentMax) return apiError(`Текст должен быть короче ${LIMITS.postContentMax} символов`)
  const image = sanitizeImageUrl(body?.image)
  const tags = normalizeTags(body?.tags)
  const anonymous = body?.anonymous === true
  // Community posts always appear from the community; "anonymous" only hides the author credit.
  const asCommunity = true

  const siteRole = (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role
  const role = await getCommunityRole(db, community.id, community.created_by, auth.userId, siteRole)

  // Editors publish directly to the wall.
  if (canModerate(role)) {
    const postId = await publishToWall(db, { communityId: community.id, authorId: auth.userId, title, content, image, tags, asCommunity, anonymous })
    return apiResponse({ status: "published", postId }, 201)
  }

  // Everyone else lands in the suggestion queue.
  await db.run(
    "INSERT INTO community_submissions (id, community_id, author_id, title, content, image, tags, as_community, anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [uuid(), community.id, auth.userId, title, content, image, JSON.stringify(tags), asCommunity ? 1 : 0, anonymous ? 1 : 0]
  )

  return apiResponse({ status: "queued" }, 201)
}