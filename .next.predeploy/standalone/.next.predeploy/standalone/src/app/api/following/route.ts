import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError } from "@/lib/auth"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const users = await db.all(`
    SELECT u.id, u.username, u.team, u.karma
    FROM follows f
    JOIN users u ON u.id = f.followed_id
    WHERE f.follower_id = ? AND u.banned = 0
    ORDER BY f.created_at DESC
  `, [auth.userId])
  return apiResponse({ users })
}