import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { validateEmail } from "@/lib/validation"
import { rateLimitGuard } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "change-email", 10, 60 * 60 * 1000)
  if (limited) return limited

  const { email, password } = await req.json()
  const checked = validateEmail(email)
  if (!checked.ok) return apiError(checked.error)

  const db = getDb()
  const row = await db.get("SELECT password_hash FROM users WHERE id = $1", [auth.userId]) as { password_hash: string } | undefined
  if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash)) {
    return apiError("Неверный пароль", 400)
  }

  const exists = await db.get("SELECT 1 FROM users WHERE email = $1 AND id != $2", [checked.value, auth.userId])
  if (exists) return apiError("Этот email уже используется", 400)

  await db.run("UPDATE users SET email = $1 WHERE id = $2", [checked.value, auth.userId])
  return apiResponse({ ok: true, email: checked.value })
}