import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { checkAndGrantAchievements } from "@/lib/achievements"
import { v4 as uuid } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { id } = await params
  const { direction } = await req.json()
  if (![1, -1].includes(direction)) return apiError("Направление: 1 или -1")

  const db = getDb()
  const post = await db.get<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM posts WHERE id = ? AND deleted = 0", [id]
  )
  if (!post) return apiError("Пост не найден", 404)
  if (post.user_id === auth.userId) return apiError("Нельзя голосовать за свой пост", 400)

  const authorId = post.user_id

  await db.transaction(async (tx) => {
    const existing = await tx.get<{ id: string; direction: number }>(
      "SELECT id, direction FROM votes WHERE user_id = ? AND post_id = ?",
      [auth.userId, id]
    )

    if (existing) {
      if (existing.direction === direction) {
        await tx.run("DELETE FROM votes WHERE id = ?", [existing.id])
        await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [-direction, authorId])
      } else {
        await tx.run("UPDATE votes SET direction = ? WHERE id = ?", [direction, existing.id])
        await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [direction * 2, authorId])
      }
    } else {
      await tx.run("INSERT INTO votes (id, user_id, post_id, direction) VALUES (?, ?, ?, ?)", [uuid(), auth.userId, id, direction])
      await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [direction, authorId])

      if (direction === 1) {
        const prefs = await tx.get<{ notif_upvotes?: number }>(
          "SELECT notif_upvotes FROM users WHERE id = ?", [authorId]
        )
        if (prefs?.notif_upvotes !== 0) {
          await tx.run(
            "INSERT INTO notifications (id, user_id, type, actor_id, post_id) VALUES (?, ?, 'upvote', ?, ?)",
            [uuid(), authorId, auth.userId, id]
          )
        }
      }
    }
  })

  await checkAndGrantAchievements(db, authorId)

  const up = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM votes WHERE post_id = ? AND direction = 1", [id]))?.c ?? 0
  const down = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM votes WHERE post_id = ? AND direction = -1", [id]))?.c ?? 0

  const userVote = await db.get<{ direction?: number }>(
    "SELECT direction FROM votes WHERE user_id = ? AND post_id = ?", [auth.userId, id]
  )

  return apiResponse({ upvotes: up, downvotes: down, user_vote: userVote?.direction || null })
}