import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { v4 as uuid } from "uuid"

const REASONS = new Set(["spam", "abuse", "spoiler", "misinformation", "other"])
type ReportTarget = { id: string; user_id: string; post_id?: string }

async function isStaff(db: ReturnType<typeof getDb>, userId: string) {
  const row = await db.get("SELECT role FROM users WHERE id = ?", [userId]) as { role?: string } | undefined
  return row?.role === "admin" || row?.role === "moderator"
}

export async function GET(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const db = getDb()
  if (!isStaff(db, auth.userId)) return apiError("Только для модераторов", 403)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "open"
  const rows = await db.all(`
    SELECT r.*, reporter.username as reporter_username,
      target.username as target_username,
      p.title as post_title,
      p.deleted as post_deleted,
      c.content as comment_content,
      c.deleted as comment_deleted
    FROM reports r
    JOIN users reporter ON reporter.id = r.reporter_id
    LEFT JOIN users target ON target.id = r.target_user_id
    LEFT JOIN posts p ON p.id = r.post_id
    LEFT JOIN comments c ON c.id = r.comment_id
    WHERE (? = 'all' OR r.status = ?)
    ORDER BY r.created_at DESC
    LIMIT 100
  `, [status, status])

  return apiResponse({ reports: rows })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const { postId, commentId, userId, reason, details } = await req.json()
  if (!postId && !commentId && !userId) return apiError("Нужен пост, комментарий или пользователь", 400)
  if (!REASONS.has(reason)) return apiError("Некорректная причина жалобы", 400)

  const db = getDb()
  let cleanPostId = typeof postId === "string" ? postId : null
  const cleanCommentId = typeof commentId === "string" ? commentId : null
  const cleanUserId = typeof userId === "string" ? userId : null
  let target: ReportTarget | null = null

  if (cleanCommentId) {
    target = await db.get("SELECT id, user_id, post_id FROM comments WHERE id = ? AND deleted = 0", [cleanCommentId]) as { id: string; user_id: string; post_id: string } | undefined || null
    if (!target) return apiError("Комментарий не найден", 404)
    cleanPostId = target.post_id || null
  } else if (cleanPostId) {
    target = await db.get("SELECT id, user_id FROM posts WHERE id = ? AND deleted = 0", [cleanPostId]) as { id: string; user_id: string } | undefined || null
    if (!target) return apiError("Пост не найден", 404)
  } else if (cleanUserId) {
    const u = await db.get("SELECT id FROM users WHERE id = ? AND banned = 0", [cleanUserId]) as { id: string } | undefined || null
    if (!u) return apiError("Пользователь не найден", 404)
    target = { id: u.id, user_id: u.id }
  }

  if (!target) return apiError("Цель жалобы не найдена", 404)
  if (target.user_id === auth.userId) return apiError("Нельзя пожаловаться на себя", 400)

  const existing = cleanCommentId
    ? await db.get("SELECT id FROM reports WHERE reporter_id = ? AND comment_id = ? AND status = 'open'", [auth.userId, cleanCommentId])
    : cleanPostId
      ? await db.get("SELECT id FROM reports WHERE reporter_id = ? AND post_id = ? AND comment_id IS NULL AND status = 'open'", [auth.userId, cleanPostId])
      : await db.get("SELECT id FROM reports WHERE reporter_id = ? AND target_user_id = ? AND post_id IS NULL AND comment_id IS NULL AND status = 'open'", [auth.userId, target.user_id])
  if (existing) return apiError("Жалоба уже отправлена", 409)

  const id = uuid()
  await db.run(`
    INSERT INTO reports (id, reporter_id, post_id, comment_id, target_user_id, reason, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, auth.userId, cleanPostId, cleanCommentId, target.user_id, reason, details || null])

  return apiResponse({ report: { id, postId: cleanPostId, commentId: cleanCommentId, reason, status: "open" } }, 201)
}

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  if (!isStaff(db, auth.userId)) return apiError("Только для модераторов", 403)

  const { id, status, resolution } = await req.json()
  if (!id) return apiError("ID жалобы обязателен", 400)
  if (!["resolved", "dismissed"].includes(status)) return apiError("Некорректный статус", 400)

  const report = await db.get("SELECT id FROM reports WHERE id = ?", [id])
  if (!report) return apiError("Жалоба не найдена", 404)

  await db.run(`
    UPDATE reports
    SET status = ?, resolution = ?, resolved_by = ?, resolved_at = NOW()
    WHERE id = ?
  `, [status, resolution || null, auth.userId, id])

  return apiResponse({ ok: true })
}