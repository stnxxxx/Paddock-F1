import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { userId } = await req.json()
  if (!userId || userId === auth.userId) return apiError("Некорректный ID", 400)

  const db = getDb()
  const target = await db.get("SELECT id, banned FROM users WHERE id = ?", [userId]) as { id: string; banned?: number } | undefined
  if (!target || target.banned) return apiError("Пользователь не найден", 404)
  const existing = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?", [auth.userId, userId])
  if (existing) {
    await db.run("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?", [auth.userId, userId])
    return apiResponse({ following: false })
  }
  await db.run("INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)", [auth.userId, userId])
  return apiResponse({ following: true })
}