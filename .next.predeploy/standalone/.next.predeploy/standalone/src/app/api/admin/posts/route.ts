import { getDb } from "@/db"
import { requireAdmin, apiResponse } from "@/lib/auth"

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error
  const db = getDb()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 20
  const offset = (page - 1) * limit

  const query = q
    ? "WHERE (p.title LIKE ? OR p.content LIKE ? OR u.username LIKE ?) AND p.deleted = 0"
    : "WHERE p.deleted = 0"
  const likeQ = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []

  const total = (await db.get(`
    SELECT COUNT(*) as c FROM posts p JOIN users u ON u.id = p.user_id ${query}
  `, [...likeQ]) as any).c

  const posts = await db.all(`
    SELECT p.*, u.username, u.team,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    ${query}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `, [...likeQ, limit, offset])

  return apiResponse({ posts, total, page, limit })
}