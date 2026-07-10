import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"

type UserRole = { role?: string }
type PostOwner = { user_id: string }
type CommentOwner = { user_id: string }
type TargetUser = { id: string; role?: string }

async function roleOf(db: ReturnType<typeof getDb>, userId: string): Promise<string> {
  return (await db.get("SELECT role FROM users WHERE id = ?", [userId]) as UserRole | undefined)?.role || "user"
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const role = await roleOf(db, auth.userId)
  const isAdmin = role === "admin"
  const isStaff = isAdmin || role === "moderator" // admin or moderator may moderate content
  const { action, postId, commentId, userId, reportId } = await req.json()

  if (action === "delete_post" && postId) {
    const post = await db.get("SELECT user_id FROM posts WHERE id = ?", [postId]) as PostOwner | undefined
    if (!post) return apiError("Пост не найден", 404)

    if (!isStaff && post.user_id !== auth.userId) return apiError("Нет прав на удаление", 403)

    await db.run("UPDATE posts SET deleted = 1 WHERE id = ?", [postId])
    if (reportId && isStaff) {
      await db.run(`
        UPDATE reports
        SET status = 'resolved', resolution = 'post_deleted', resolved_by = ?, resolved_at = NOW()
        WHERE id = ?
      `, [auth.userId, reportId])
    }
    return apiResponse({ ok: true })
  }

  if (action === "delete_comment" && commentId) {
    const comment = await db.get("SELECT user_id FROM comments WHERE id = ? AND deleted = 0", [commentId]) as CommentOwner | undefined
    if (!comment) return apiError("Комментарий не найден", 404)

    if (!isStaff && comment.user_id !== auth.userId) return apiError("Нет прав на удаление", 403)

    await db.run("UPDATE comments SET deleted = 1 WHERE id = ?", [commentId])
    if (reportId && isStaff) {
      await db.run(`
        UPDATE reports
        SET status = 'resolved', resolution = 'comment_deleted', resolved_by = ?, resolved_at = NOW()
        WHERE id = ?
      `, [auth.userId, reportId])
    }
    return apiResponse({ ok: true })
  }

  if ((action === "ban_user" || action === "unban_user") && userId) {
    if (!isAdmin) return apiError("Только для администраторов", 403)
    await db.run(action === "ban_user" ? "UPDATE users SET banned = 1 WHERE id = ?" : "UPDATE users SET banned = 0 WHERE id = ?", [userId])
    if (reportId) {
      await db.run(`
        UPDATE reports
        SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW()
        WHERE id = ?
      `, [action, auth.userId, reportId])
    }
    return apiResponse({ ok: true })
  }

  if ((action === "promote_user" || action === "demote_user") && userId) {
    if (!isAdmin) return apiError("Только для администраторов", 403)

    const target = await db.get("SELECT id, role FROM users WHERE id = ?", [userId]) as TargetUser | undefined
    if (!target) return apiError("Пользователь не найден", 404)
    if (target.role === "admin" && action === "promote_user") return apiError("Уже администратор", 400)
    if (target.role !== "admin" && action === "demote_user") return apiError("Пользователь не администратор", 400)

    await db.run("UPDATE users SET role = ? WHERE id = ?", [action === "promote_user" ? "admin" : "user", userId])
    return apiResponse({ ok: true })
  }

  if ((action === "set_moderator" || action === "unset_moderator") && userId) {
    if (!isAdmin) return apiError("Только для администраторов", 403)
    const target = await db.get("SELECT id, role FROM users WHERE id = ?", [userId]) as TargetUser | undefined
    if (!target) return apiError("Пользователь не найден", 404)
    if (target.role === "admin") return apiError("Нельзя менять роль администратора", 400)
    await db.run("UPDATE users SET role = ? WHERE id = ?", [action === "set_moderator" ? "moderator" : "user", userId])
    return apiResponse({ ok: true })
  }

  return apiError("Неизвестное действие", 400)
}