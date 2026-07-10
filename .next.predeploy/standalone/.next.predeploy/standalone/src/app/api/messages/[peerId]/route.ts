import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"
import { isMutualFollow } from "@/lib/messages"

interface PeerRow {
  id: string
  username: string
  display_name: string | null
  team: string | null
  driver: string | null
  avatar: string | null
  banned: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ peerId: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const { peerId } = await params
  const me = auth.userId
  if (peerId === me) return apiError("Некорректный собеседник", 400)

  const db = getDb()
  const peer = await db.get<PeerRow>(
    "SELECT id, username, display_name, team, driver, CASE WHEN avatar LIKE '/uploads/%' OR avatar LIKE 'http%' THEN avatar ELSE NULL END as avatar, banned FROM users WHERE id = ?",
    [peerId]
  )
  if (!peer || peer.banned) return apiError("Пользователь не найден", 404)

  const messages = await db.all(`
    SELECT id, sender_id, recipient_id, content, image, read, created_at
    FROM dm_messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
    LIMIT 200
  `, [me, peerId, peerId, me])

  await db.run("UPDATE dm_messages SET read = 1 WHERE recipient_id = ? AND sender_id = ? AND read = 0", [me, peerId])

  return apiResponse({
    peer: { id: peer.id, username: peer.username, display_name: peer.display_name, team: peer.team, driver: peer.driver, avatar: peer.avatar },
    messages,
    canMessage: await isMutualFollow(db, me, peerId),
  })
}