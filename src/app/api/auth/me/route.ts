import { getAuthUser, apiResponse, apiError, apiBanGuard, clearAuthCookie } from "@/lib/auth"
import { getDb } from "@/db"
import type { DbQuery } from "@/db"
import { sanitizeImageUrl } from "@/lib/validation"

async function getUserWithFlairs(db: DbQuery, userId: string) {
  const user = await db.get(
    "SELECT id, username, display_name, email, team, driver, role, avatar, cover, bio, karma, onboarded, created_at FROM users WHERE id = $1",
    [userId]
  ) as any

  if (!user) return null

  const flairs = await db.all(
    "SELECT f.id, f.name, f.icon, f.color FROM flairs f JOIN user_flairs uf ON uf.flair_id = f.id WHERE uf.user_id = $1",
    [userId]
  ) as any[]

  return { ...user, flairs: flairs || [] }
}

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const db = getDb()
  const user = await getUserWithFlairs(db, auth.userId)

  if (!user) return apiError("Пользователь не найден", 404)
  return apiResponse({ user })
}

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const body = await req.json()
  const db = getDb()

  if (body.team !== undefined) {
    await db.run("UPDATE users SET team = $1 WHERE id = $2", [body.team || null, auth.userId])
  }
  if (body.bio !== undefined) {
    await db.run("UPDATE users SET bio = $1 WHERE id = $2", [body.bio || null, auth.userId])
  }
  if (body.display_name !== undefined) {
    const name = String(body.display_name || "").trim().slice(0, 40)
    await db.run("UPDATE users SET display_name = $1 WHERE id = $2", [name || null, auth.userId])
  }
  if (body.avatar !== undefined) {
    await db.run("UPDATE users SET avatar = $1 WHERE id = $2", [sanitizeImageUrl(body.avatar), auth.userId])
  }
  if (body.cover !== undefined) {
    await db.run("UPDATE users SET cover = $1 WHERE id = $2", [sanitizeImageUrl(body.cover), auth.userId])
  }

  const user = await getUserWithFlairs(db, auth.userId)
  return apiResponse({ user })
}

export async function POST() {
  await clearAuthCookie()
  return apiResponse({ ok: true })
}