import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { LIMITS } from "@/lib/validation"
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

  const limited = rateLimitGuard(req, "comment-create", 30, 10 * 60 * 1000)
  if (limited) return limited

  const { id } = await params
  const { content, parent_id } = await req.json()
  if (!content || !content.trim()) return apiError("Комментарий не может быть пустым")
  if (content.trim().length > LIMITS.commentMax) return apiError(`Комментарий должен быть короче ${LIMITS.commentMax} символов`)

  const db = getDb()
  const targetPost = await db.get("SELECT id FROM posts WHERE id = ? AND deleted = 0", [id])
  if (!targetPost) return apiError("Пост не найден", 404)
  if (parent_id) {
    const parent = await db.get("SELECT id FROM comments WHERE id = ? AND post_id = ? AND deleted = 0", [parent_id, id])
    if (!parent) return apiError("Родительский комментарий не найден", 404)
  }

  const commentId = uuid()
  await db.run(
    "INSERT INTO comments (id, user_id, post_id, parent_id, content) VALUES (?, ?, ?, ?, ?)",
    [commentId, auth.userId, id, parent_id || null, content.trim()]
  )

  await checkAndGrantAchievements(db, auth.userId)

  const comment = await db.get(`
    SELECT c.*, u.username, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      0 as upvotes,
      0 as downvotes,
      NULL as user_vote
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `, [commentId])

  const postOwner = await db.get<{ user_id: string }>("SELECT user_id FROM posts WHERE id = ?", [id])
  if (postOwner && postOwner.user_id !== auth.userId) {
    const prefs = await db.get<{ notif_comments?: number }>("SELECT notif_comments FROM users WHERE id = ?", [postOwner.user_id])
    if (prefs?.notif_comments !== 0) {
      await db.run(
        "INSERT INTO notifications (id, user_id, type, actor_id, post_id, comment_id) VALUES (?, ?, 'comment', ?, ?, ?)",
        [uuid(), postOwner.user_id, auth.userId, id, commentId]
      )
    }
  }

  const mentions = content.match(/@(\w+)/g)
  if (mentions) {
    for (const m of mentions) {
      const mentionedName = m.slice(1)
      const mentioned = await db.get<{ id: string }>("SELECT id FROM users WHERE username = ? AND id != ?", [mentionedName, auth.userId])
      if (mentioned && mentioned.id !== postOwner?.user_id) {
        const prefs = await db.get<{ notif_mentions?: number }>("SELECT notif_mentions FROM users WHERE id = ?", [mentioned.id])
        if (prefs?.notif_mentions !== 0) {
          await db.run(
            "INSERT INTO notifications (id, user_id, type, actor_id, post_id, comment_id) VALUES (?, ?, 'mention', ?, ?, ?)",
            [uuid(), mentioned.id, auth.userId, id, commentId]
          )
        }
      }
    }
  }

  return apiResponse({ comment }, 201)
}