import { getDb } from "@/db"
import { requireAdmin, apiResponse } from "@/lib/auth"

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error
  const db = getDb()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const sort = searchParams.get("sort") || "new"

  let orderBy = "u.created_at DESC"
  if (sort === "karma") orderBy = "u.karma DESC"
  if (sort === "name") orderBy = "u.username ASC"

  const query = q
    ? "WHERE u.username LIKE ? OR u.email LIKE ?"
    : ""
  const likeQ = q ? [`%${q}%`, `%${q}%`] : []

  const users = await db.all(`
    SELECT u.id, u.username, u.email, u.team, u.driver, u.karma, u.role, u.banned, u.created_at,
      COALESCE(pc.cnt, 0) as post_count,
      COALESCE(cc.cnt, 0) as comment_count
    FROM users u
    LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM posts WHERE deleted = 0 GROUP BY user_id) pc ON pc.user_id = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY user_id) cc ON cc.user_id = u.id
    ${query}
    ORDER BY ${orderBy}
    LIMIT 100
  `, [...likeQ])

  return apiResponse({ users })
}