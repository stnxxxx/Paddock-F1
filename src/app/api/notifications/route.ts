import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const prefs = await db.get(
    "SELECT notif_comments, notif_upvotes, notif_mentions, notif_fantasy FROM users WHERE id = ?", [auth.userId]
  ) as {
    notif_comments?: number
    notif_upvotes?: number
    notif_mentions?: number
    notif_fantasy?: number
  } | undefined

  const conditions: string[] = []
  if (!prefs?.notif_comments) conditions.push("n.type != 'comment'")
  if (!prefs?.notif_upvotes) conditions.push("n.type != 'upvote'")
  if (!prefs?.notif_mentions) conditions.push("n.type != 'mention'")
  if (!prefs?.notif_fantasy) conditions.push("n.type != 'fantasy'")
  const filter = conditions.length ? "AND " + conditions.join(" AND ") : ""

  const notifs = await db.all(`
    SELECT n.*, u.username as actor_username, u.team as actor_team,
      p.title as post_title
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.user_id = ?
      AND u.banned = 0
      AND (n.post_id IS NULL OR (p.id IS NOT NULL AND p.deleted = 0))
      ${filter}
    ORDER BY n.created_at DESC
    LIMIT 50
  `, [auth.userId])

  const unread = await db.get(
    `SELECT COUNT(*) as c
     FROM notifications n
     JOIN users u ON u.id = n.actor_id
     LEFT JOIN posts p ON p.id = n.post_id
     WHERE n.user_id = ?
       AND n.read = 0
       AND u.banned = 0
       AND (n.post_id IS NULL OR (p.id IS NOT NULL AND p.deleted = 0))
       ${filter}`, [auth.userId]
  ) as { c?: number } | undefined

  return apiResponse({ notifications: notifs, unread: unread?.c || 0 })
}

export async function POST() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  await db.run("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0", [auth.userId])
  return apiResponse({ ok: true })
}

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const { id } = await req.json().catch(() => ({ id: null })) as { id?: string | null }
  if (!id) return apiError("ID обязателен", 400)

  const db = getDb()
  await db.run("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", [id, auth.userId])
  return apiResponse({ ok: true })
}