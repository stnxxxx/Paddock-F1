import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { sanitizeImageUrl, LIMITS } from "@/lib/validation"
import { isMutualFollow } from "@/lib/messages"
import { v4 as uuid } from "uuid"

const AVATAR_CASE = "CASE WHEN peer.avatar LIKE '/uploads/%' OR peer.avatar LIKE 'http%' THEN peer.avatar ELSE NULL END as avatar"

export async function GET(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const db = getDb()
  const me = auth.userId

  // Cheap unread-only mode for the nav badge.
  if (new URL(req.url).searchParams.get("count")) {
const unread = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM dm_messages WHERE recipient_id = ? AND read = 0", [me]))?.c ?? 0
    return apiResponse({ unread })
  }

  const conversations = await db.all(`
    SELECT peer.id, peer.username, peer.display_name, peer.team, ${AVATAR_CASE},
      last.content as last_content, last.image as last_image, last.created_at as last_at, last.sender_id as last_sender,
      (SELECT COUNT(*) FROM dm_messages WHERE recipient_id = ? AND sender_id = peer.id AND read = 0) as unread
    FROM (
      SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as peer_id, MAX(created_at) as last_at
      FROM dm_messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY peer_id
    ) conv
    JOIN users peer ON peer.id = conv.peer_id
    JOIN dm_messages last ON last.id = (
      SELECT id FROM dm_messages
      WHERE (sender_id = ? AND recipient_id = conv.peer_id) OR (sender_id = conv.peer_id AND recipient_id = ?)
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE peer.banned = 0
    ORDER BY conv.last_at DESC
  `, [me, me, me, me, me, me])

  const unread = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM dm_messages WHERE recipient_id = ? AND read = 0", [me]))?.c ?? 0
  return apiResponse({ conversations, unread })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "dm-send", 60, 5 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const recipientId = typeof body.recipientId === "string" ? body.recipientId : ""
  const content = typeof body.content === "string" ? body.content.trim() : ""
  const image = sanitizeImageUrl(body.image)
  if (!recipientId || recipientId === auth.userId) return apiError("Некорректный получатель", 400)
  if (!content && !image) return apiError("Пустое сообщение", 400)
  if (content.length > LIMITS.postContentMax) return apiError("Слишком длинное сообщение", 400)

  const db = getDb()
  const recipient = await db.get<{ id: string; banned?: number }>("SELECT id, banned FROM users WHERE id = ?", [recipientId])
  if (!recipient || recipient.banned) return apiError("Пользователь не найден", 404)
  if (!await isMutualFollow(db, auth.userId, recipientId)) return apiError("Личные сообщения доступны только при взаимной подписке", 403)

  const id = uuid()
  await db.run("INSERT INTO dm_messages (id, sender_id, recipient_id, content, image) VALUES (?, ?, ?, ?, ?)",
    [id, auth.userId, recipientId, content, image])

  return apiResponse({ id, content, image }, 201)
}