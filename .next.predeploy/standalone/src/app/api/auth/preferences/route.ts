import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const db = getDb()
  const prefs = await db.get(
    "SELECT notif_comments, notif_upvotes, notif_mentions, notif_fantasy, hide_team, hide_driver, hide_leaderboard FROM users WHERE id = $1",
    [auth.userId]
  ) as any

  return apiResponse({ preferences: prefs })
}

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const body = await req.json()
  const db = getDb()
  const fields = ["notif_comments", "notif_upvotes", "notif_mentions", "notif_fantasy", "hide_team", "hide_driver", "hide_leaderboard"]
  for (const f of fields) {
    if (body[f] !== undefined) {
      await db.run(`UPDATE users SET ${f} = $1 WHERE id = $2`, [body[f] ? 1 : 0, auth.userId])
    }
  }
  return apiResponse({ ok: true })
}