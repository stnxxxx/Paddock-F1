import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { v4 as uuid } from "uuid"

const MAX_MESSAGE_LENGTH = 400
const MAX_MESSAGES = 80

function normalizeSessionKey(value: unknown, room: unknown) {
  if (room !== "session") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionKey = normalizeSessionKey(searchParams.get("sessionKey"), searchParams.get("room"))
  const db = getDb()

  const messages = (await db.all(`
    SELECT m.id, m.session_key, m.content, m.created_at, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar
    FROM live_chat_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.deleted = 0 AND (
      (? IS NULL AND m.session_key IS NULL) OR m.session_key = ?
    )
    ORDER BY m.created_at DESC
    LIMIT ?
  `, [sessionKey, sessionKey, MAX_MESSAGES]) as any[]).reverse()

  return apiResponse({ messages, room: sessionKey === null ? "global" : "session", sessionKey })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const body = await req.json().catch(() => null) as {
    content?: string
    room?: "global" | "session"
    sessionKey?: number | string | null
  } | null
  const content = body?.content?.trim()
  if (!content) return apiError("Сообщение не может быть пустым", 400)
  if (content.length > MAX_MESSAGE_LENGTH) {
    return apiError(`Сообщение должно быть короче ${MAX_MESSAGE_LENGTH} символов`, 400)
  }

  const sessionKey = normalizeSessionKey(body?.sessionKey, body?.room)
  const db = getDb()
  const id = uuid()
  await db.run(
    "INSERT INTO live_chat_messages (id, user_id, session_key, content) VALUES (?, ?, ?, ?)",
    [id, auth.userId, sessionKey, content]
  )

  const message = await db.get(`
    SELECT m.id, m.session_key, m.content, m.created_at, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar
    FROM live_chat_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `, [id])

  return apiResponse({ message, room: sessionKey === null ? "global" : "session", sessionKey }, 201)
}

export async function DELETE(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const user = await db.get("SELECT role FROM users WHERE id = ?", [auth.userId]) as { role?: string } | undefined
  if (user?.role !== "admin") return apiError("Только для администраторов", 403)

  const body = await req.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return apiError("ID обязателен", 400)

  await db.run("UPDATE live_chat_messages SET deleted = 1 WHERE id = ?", [body.id])
  return apiResponse({ ok: true })
}