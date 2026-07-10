import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, clearAuthCookie } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const limited = rateLimitGuard(req, "delete-account", 5, 60 * 60 * 1000)
  if (limited) return limited

  const { password } = await req.json()
  const db = getDb()
  const row = await db.get("SELECT password_hash FROM users WHERE id = $1", [auth.userId]) as { password_hash: string } | undefined
  if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash)) {
    return apiError("Неверный пароль", 400)
  }

  const short = auth.userId.replace(/-/g, "").slice(0, 10)
  await db.run(
    "UPDATE users SET banned = 1, email = $1, username = $2, display_name = NULL, bio = NULL, avatar = NULL, cover = NULL, team = NULL, driver = NULL, password_hash = $3 WHERE id = $4",
    [`${auth.userId}@deleted.invalid`, `deleted_${short}`, bcrypt.hashSync(randomUUID(), 10), auth.userId]
  )

  await clearAuthCookie()
  return apiResponse({ ok: true })
}