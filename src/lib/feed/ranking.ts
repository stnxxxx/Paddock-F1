import { type DbQuery } from "@/db"
import { POST_BASE_JOINS, postColumns, inflateTags } from "./post-projection"
import { loadFeedWeights, type FeedWeights } from "./weights"

const CANDIDATE_DAYS = 30
const CANDIDATE_CAP = 250
const TOP_TAGS_LIMIT = 12
const BOOST_TAG_WEIGHT = 3

interface Candidate {
  [k: string]: unknown
  user_id: string
  title: string | null
  content: string | null
  created_at: string
  upvotes: number
  downvotes: number
  comment_count: number
  author_karma: number
  author_team: string | null
  is_followed: number
  seen: number
  user_vote?: number | null
  tags: string[]
  _score: number
}

interface InterestProfile {
  tags: Map<string, number>
  team: string | null
  driver: string | null
}

// created_at is stored as 'YYYY-MM-DD HH:MM:SS' (UTC) or a Date from PG.
function parseTs(s: string | Date): number {
  const str = typeof s === "string" ? s : s.toISOString()
  const norm = str.includes("T") ? str : str.replace(" ", "T") + "Z"
  const t = Date.parse(norm)
  return Number.isFinite(t) ? t : Date.now()
}

async function buildInterestProfile(db: DbQuery, userId: string): Promise<InterestProfile> {
  const u = await db.get<{ team: string | null; driver: string | null }>(
    "SELECT team, driver FROM users WHERE id = ?", [userId]
  )

  const tags = new Map<string, number>()
  // Tags from content the user engaged with (upvoted / bookmarked / authored / commented).
  const rows = await db.all<{ tag: string; w: number }>(`
    SELECT pt.tag as tag, COUNT(*) as w
    FROM post_tags pt
    WHERE pt.post_id IN (
      SELECT post_id FROM votes WHERE user_id = ? AND direction = 1
      UNION SELECT post_id FROM bookmarks WHERE user_id = ?
      UNION SELECT id FROM posts WHERE user_id = ?
      UNION SELECT post_id FROM comments WHERE user_id = ? AND deleted = 0
    )
    GROUP BY pt.tag
    ORDER BY w DESC
    LIMIT ?
  `, [userId, userId, userId, userId, TOP_TAGS_LIMIT])
  for (const r of rows) tags.set(r.tag.toLowerCase(), r.w)

  // Explicit interest boosts (onboarding picker / "показывать больше такого").
  const boosts = await db.all<{ value: string }>(
    "SELECT value FROM feed_signals WHERE user_id = ? AND type = 'boost_tag'", [userId]
  )
  for (const b of boosts) {
    const k = b.value.toLowerCase()
    tags.set(k, (tags.get(k) || 0) + BOOST_TAG_WEIGHT)
  }

  return { tags, team: u?.team ?? null, driver: u?.driver ?? null }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Greedy single-pass re-rank: orders by score but applies dynamic penalties so the
 * same author/tag isn't repeated back-to-back, caps posts per author, and nudges in
 * out-of-network ("discovery") posts until they reach the configured share.
 */
function rerank(items: Candidate[], w: FeedWeights): Candidate[] {
  const remaining = items.slice()
  const result: Candidate[] = []
  const authorCount = new Map<string, number>()
  let outCount = 0

  while (remaining.length) {
    let bestIdx = 0
    let bestAdj = -Infinity
    const prev1 = result[result.length - 1]
    const prev2 = result[result.length - 2]
    const share = result.length ? outCount / result.length : 0

    for (let k = 0; k < remaining.length; k++) {
      const it = remaining[k]
      let adj = it._score
      if (prev1 && prev1.user_id === it.user_id) adj -= 1.5
      if (prev2 && prev2.user_id === it.user_id) adj -= 0.5
      const tag = it.tags[0]
      if (tag && prev1 && prev1.tags[0] === tag) adj -= 0.8
      if ((authorCount.get(it.user_id) || 0) >= w.maxPerAuthorPerPage) adj -= 3
      if (!it.is_followed && share < w.discoveryShare) adj += 1.0
      if (adj > bestAdj) { bestAdj = adj; bestIdx = k }
    }

    const [picked] = remaining.splice(bestIdx, 1)
    result.push(picked)
    authorCount.set(picked.user_id, (authorCount.get(picked.user_id) || 0) + 1)
    if (!picked.is_followed) outCount++
  }
  return result
}

const INTERNAL_FIELDS = ["author_id", "author_karma", "author_team", "is_followed", "seen", "_score"] as const

function stripInternal(c: Candidate): Record<string, unknown> {
  const rest = { ...c }
  for (const f of INTERNAL_FIELDS) delete rest[f]
  return rest
}

/**
 * Personalized "Для вас" ranking. Falls back to pure trending (freshness + velocity)
 * for guests and cold-start users. Returns a page slice of a re-ranked candidate set.
 */
export async function rankForYou(
  db: DbQuery,
  userId: string | null,
  page: number,
  limit: number
): Promise<{ posts: Record<string, unknown>[]; total: number }> {
  const w = await loadFeedWeights(db)
  const authed = !!userId
  const profile = authed ? await buildInterestProfile(db, userId!) : null

  const authJoinsNamed = authed
    ? `LEFT JOIN votes uv ON uv.post_id = p.id AND uv.user_id = ?
       LEFT JOIN bookmarks bm ON bm.post_id = p.id AND bm.user_id = ?`
    : ""
  const followedExpr = authed
    ? `CASE WHEN EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.followed_id=p.user_id)
              OR EXISTS(SELECT 1 FROM community_posts cp JOIN community_subscriptions cs ON cs.community_id=cp.community_id WHERE cp.post_id=p.id AND cs.user_id=?)
         THEN 1 ELSE 0 END`
    : "0"
  const seenExpr = authed
    ? `CASE WHEN EXISTS(SELECT 1 FROM feed_seen fs WHERE fs.user_id=? AND fs.post_id=p.id) THEN 1 ELSE 0 END`
    : "0"
  const muteFilter = authed
    ? `AND NOT EXISTS (SELECT 1 FROM feed_signals ma WHERE ma.user_id=? AND ma.type='mute_author' AND ma.value=p.user_id)
       AND NOT EXISTS (SELECT 1 FROM post_tags pm JOIN feed_signals mt ON mt.user_id=? AND mt.type='mute_tag' AND mt.value=pm.tag WHERE pm.post_id=p.id)`
    : ""

  const sql = `
    SELECT ${postColumns(authed)},
      p.user_id as author_id,
      u.karma as author_karma,
      u.team as author_team,
      ${followedExpr} as is_followed,
      ${seenExpr} as seen
    ${POST_BASE_JOINS}
    ${authJoinsNamed}
    WHERE p.deleted = 0
      AND EXISTS (SELECT 1 FROM users a WHERE a.id = p.user_id AND a.banned = 0)
      AND p.created_at >= NOW() - INTERVAL '${CANDIDATE_DAYS} days'
      ${muteFilter}
    ORDER BY p.created_at DESC
    LIMIT ?
  `

  const params: unknown[] = []
  if (authed) {
    // authJoinsNamed: 2 params
    params.push(userId, userId)
    // followedExpr: 2 params
    params.push(userId, userId)
    // seenExpr: 1 param
    params.push(userId)
    // muteFilter: 2 params
    params.push(userId, userId)
  }
  params.push(CANDIDATE_CAP)

  const candidates = (await db.all(sql, params)).map((r) => inflateTags(r as Record<string, unknown>)) as unknown as Candidate[]

  const now = Date.now()
  const userTeam = profile?.team?.toLowerCase() || null
  const userDriver = profile?.driver?.toLowerCase() || null
  const driverRe = userDriver ? new RegExp(`\\b${escapeRe(userDriver)}\\b`, "i") : null

  for (const c of candidates) {
    const ageH = Math.max(0, (now - parseTs(c.created_at)) / 3_600_000)
    const fresh = 1 / Math.pow(ageH + 2, 1.5)
    const engage = (c.upvotes - c.downvotes + 0.5 * c.comment_count) / (ageH + 2)
    let score = w.fresh * fresh + w.engage * engage

    if (authed && profile) {
      const tagsLower = Array.isArray(c.tags) ? c.tags.map((t) => t.toLowerCase()) : []
      if (c.is_followed) score += w.follow
      const teamMatch = userTeam && ((c.author_team && c.author_team.toLowerCase() === userTeam) || tagsLower.includes(userTeam))
      if (teamMatch) score += w.team
      if (userDriver) {
        const text = `${c.title || ""} ${c.content || ""}`
        if (tagsLower.includes(userDriver) || (driverRe && driverRe.test(text))) score += w.driver
      }
      let overlap = 0
      for (const t of tagsLower) if (profile.tags.has(t)) overlap += 1
      score += w.topic * overlap
      score += w.author * (c.author_karma / (c.author_karma + 500))
      if (c.user_vote === -1) score -= w.penaltyDownvotedAuthor
      if (c.seen) score -= w.penaltySeen
    }
    c._score = score
  }

  const ordered = rerank(candidates, w)
  const total = ordered.length
  const start = (page - 1) * limit
  const posts = ordered.slice(start, start + limit).map(stripInternal)
  return { posts, total }
}