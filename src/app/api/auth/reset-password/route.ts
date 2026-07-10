import { getDb } from "@/db"
import { apiResponse, apiError } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { validateEmail, validatePassword } from "@/lib/validation"
import { verifyAndConsumeCode } from "@/lib/email-codes"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const limited = rateLimitGuard(req, "reset-password", 10, 60 * 60 * 1000)
  if (limited) return limited

  const { email, code, password } = await req.json()
  const checkedEmail = validateEmail(email)
  if (!checkedEmail.ok) return apiError(checkedEmail.error)
  const checked = validatePassword(password)
  if (!checked.ok) return apiError(checked.error)

  const db = getDb()
  const verified = await verifyAndConsumeCode(db, checkedEmail.value, "reset", String(code || ""))
  if (!verified.ok) return apiError(verified.error || "Неверный код", 400)

  const user = await db.get("SELECT id FROM users WHERE email = $1", [checkedEmail.value]) as { id: string } | undefined
  if (!user) return apiError("Аккаунт не найден", 404)

  await db.run("UPDATE users SET password_hash = $1 WHERE id = $2", [bcrypt.hashSync(checked.value, 10), user.id])
  return apiResponse({ ok: true })
}