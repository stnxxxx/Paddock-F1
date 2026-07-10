import { getDb } from "@/db"
import { apiResponse, requireAdmin } from "@/lib/auth"

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error

  const db = getDb()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
  const limit = 30
  const offset = (page - 1) * limit

  const where = q
    ? "WHERE c.deleted = 0 AND (c.content LIKE ? OR u.username LIKE ? OR p.title LIKE ?)"
    : "WHERE c.deleted = 0"
  const likeQ = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []

  const total = (await db.get(`
    SELECT COUNT(*) as c
    FROM comments c
    JOIN users u ON u.id = c.user_id
    JOIN posts p ON p.id = c.post_id
    ${where}
  `, [...likeQ]) as { c: number }).c

  const comments = await db.all(`
    SELECT c.id, c.post_id, c.parent_id, c.content, c.created_at,
      u.id as user_id, u.username, u.team, u.driver,
      p.title as post_title,
      COALESCE(cvu.upvotes, 0) as upvotes,
      COALESCE(cvd.downvotes, 0) as downvotes,
      COALESCE(rr.cnt, 0) as open_reports
    FROM comments c
    JOIN users u ON u.id = c.user_id
    JOIN posts p ON p.id = c.post_id
    LEFT JOIN (SELECT comment_id, COUNT(*) as upvotes FROM comment_votes WHERE direction = 1 GROUP BY comment_id) cvu ON cvu.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as downvotes FROM comment_votes WHERE direction = -1 GROUP BY comment_id) cvd ON cvd.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as cnt FROM reports WHERE status = 'open' AND comment_id IS NOT NULL GROUP BY comment_id) rr ON rr.comment_id = c.id
    ${where}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `, [...likeQ, limit, offset])

  return apiResponse({ comments, total, page, limit })
}