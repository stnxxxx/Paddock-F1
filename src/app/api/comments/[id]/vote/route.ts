import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { checkAndGrantAchievements } from "@/lib/achievements"
import { v4 as uuid } from "uuid"

type CommentTarget = { id: string; user_id: string; post_id: string }

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
  const comment = await db.get<CommentTarget>(
    "SELECT id, user_id, post_id FROM comments WHERE id = ? AND deleted = 0", [id]
  )
  if (!comment) return apiError("Комментарий не найден", 404)
  if (comment.user_id === auth.userId) return apiError("Нельзя голосовать за свой комментарий", 400)

  await db.transaction(async (tx) => {
    const existing = await tx.get<{ id: string; direction: number }>(
      "SELECT id, direction FROM comment_votes WHERE user_id = ? AND comment_id = ?",
      [auth.userId, id]
    )

    if (existing) {
      if (existing.direction === direction) {
        await tx.run("DELETE FROM comment_votes WHERE id = ?", [existing.id])
        await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [-direction, comment.user_id])
      } else {
        await tx.run("UPDATE comment_votes SET direction = ? WHERE id = ?", [direction, existing.id])
        await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [direction * 2, comment.user_id])
      }
    } else {
      await tx.run("INSERT INTO comment_votes (id, user_id, comment_id, direction) VALUES (?, ?, ?, ?)", [uuid(), auth.userId, id, direction])
      await tx.run("UPDATE users SET karma = karma + ? WHERE id = ?", [direction, comment.user_id])

      if (direction === 1) {
        const prefs = await tx.get<{ notif_upvotes?: number }>(
          "SELECT notif_upvotes FROM users WHERE id = ?", [comment.user_id]
        )
        if (prefs?.notif_upvotes !== 0) {
          await tx.run(
            "INSERT INTO notifications (id, user_id, type, actor_id, post_id, comment_id) VALUES (?, ?, 'upvote', ?, ?, ?)",
            [uuid(), comment.user_id, auth.userId, comment.post_id, id]
          )
        }
      }
    }
  })

  await checkAndGrantAchievements(db, comment.user_id)

  const up = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM comment_votes WHERE comment_id = ? AND direction = 1", [id]))?.c ?? 0
  const down = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM comment_votes WHERE comment_id = ? AND direction = -1", [id]))?.c ?? 0
  const userVote = await db.get<{ direction?: number }>(
    "SELECT direction FROM comment_votes WHERE user_id = ? AND comment_id = ?", [auth.userId, id]
  )

  return apiResponse({ upvotes: up, downvotes: down, user_vote: userVote?.direction || null })
}