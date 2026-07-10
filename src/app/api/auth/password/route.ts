import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { validatePassword } from "@/lib/validation"
import { rateLimitGuard } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "change-password", 10, 60 * 60 * 1000)
  if (limited) return limited

  const { currentPassword, newPassword } = await req.json()
  const checked = validatePassword(newPassword)
  if (!checked.ok) return apiError(checked.error)

  const db = getDb()
  const row = await db.get("SELECT password_hash FROM users WHERE id = $1", [auth.userId]) as { password_hash: string } | undefined
  if (!row || !bcrypt.compareSync(String(currentPassword || ""), row.password_hash)) {
    return apiError("Неверный текущий пароль", 400)
  }

  await db.run("UPDATE users SET password_hash = $1 WHERE id = $2", [bcrypt.hashSync(checked.value, 10), auth.userId])
  return apiResponse({ ok: true })
}