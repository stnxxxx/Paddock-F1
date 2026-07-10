import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { checkAndGrantAchievements } from "@/lib/achievements"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const posts = await db.all(`
    SELECT p.*, u.username, u.team, u.driver, NULL as avatar, 1 as bookmarked,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count
    FROM posts p
    JOIN bookmarks b ON b.post_id = p.id AND b.user_id = ?
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE p.deleted = 0 AND u.banned = 0
    ORDER BY b.created_at DESC
    LIMIT 50
  `, [auth.userId])

  return apiResponse({ posts })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { postId } = await req.json()
  if (!postId) return apiError("postId обязателен")

  const db = getDb()
  const post = await db.get("SELECT id FROM posts WHERE id = ? AND deleted = 0", [postId])
  if (!post) return apiError("Пост не найден", 404)
  const existing = await db.get("SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?", [auth.userId, postId])
  if (existing) {
    await db.run("DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?", [auth.userId, postId])
    return apiResponse({ bookmarked: false })
  }
  await db.run("INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)", [auth.userId, postId])
  await checkAndGrantAchievements(db, auth.userId)
  return apiResponse({ bookmarked: true })
}