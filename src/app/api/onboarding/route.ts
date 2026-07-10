import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"

// Saves first-run interest choices: optional team/driver + topic boosts, then marks onboarded.
export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const body = await req.json().catch(() => ({}))
  const db = getDb()

  if (typeof body.team === "string" || body.team === null) {
    await db.run("UPDATE users SET team = ? WHERE id = ?", [body.team || null, auth.userId])
  }
  if (typeof body.driver === "string" || body.driver === null) {
    await db.run("UPDATE users SET driver = ? WHERE id = ?", [body.driver || null, auth.userId])
  }

  const clean: string[] = (Array.isArray(body.tags) ? body.tags : [])
    .filter((t: unknown) => typeof t === "string")
    .map((t: string) => t.trim().slice(0, 64))
    .filter(Boolean)
    .slice(0, 10)
  await db.transaction(async (db) => {
    for (const t of clean) {
      await db.run("INSERT INTO feed_signals (user_id, type, value) VALUES (?, 'boost_tag', ?) ON CONFLICT DO NOTHING", [auth.userId, t])
    }
  })

  await db.run("UPDATE users SET onboarded = 1 WHERE id = ?", [auth.userId])

  const user = await db.get(
    "SELECT id, username, display_name, email, team, driver, role, avatar, cover, bio, karma, onboarded, created_at FROM users WHERE id = ?",
    [auth.userId]
  )
  const flairs = await db.all(
    "SELECT f.id, f.name, f.icon, f.color FROM flairs f JOIN user_flairs uf ON uf.flair_id = f.id WHERE uf.user_id = ?",
    [auth.userId]
  )
  return apiResponse({ user: { ...(user as object), flairs } })
}