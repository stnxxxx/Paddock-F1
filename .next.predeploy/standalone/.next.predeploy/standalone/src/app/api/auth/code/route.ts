import { getDb } from "@/db"
import { apiResponse, apiError } from "@/lib/auth"
import { rateLimit, rateLimitGuard } from "@/lib/rate-limit"
import { validateEmail } from "@/lib/validation"
import { createAndSendCode, type CodePurpose } from "@/lib/email-codes"
import { isEmailConfigured } from "@/lib/email"

const PURPOSES: CodePurpose[] = ["register", "login", "reset"]

export async function POST(req: Request) {
  const limited = rateLimitGuard(req, "auth-code", 6, 15 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const purpose = body.purpose as CodePurpose
  if (!PURPOSES.includes(purpose)) return apiError("Некорректный запрос")
  const email = validateEmail(body.email)
  if (!email.ok) return apiError(email.error)

  const db = getDb()
  const existing = await db.get("SELECT 1 FROM users WHERE email = $1", [email.value])

  if (purpose === "register" && existing) {
    return apiError("Этот email уже зарегистрирован", 409)
  }

  const shouldSend = purpose === "register" || Boolean(existing)
  let code: string | null = null
  if (shouldSend) {
    const perEmail = rateLimit(`code-email:${purpose}:${email.value}`, 5, 60 * 60 * 1000)
    if (!perEmail.ok) {
      if (purpose === "register") {
        return apiError(`Слишком много кодов на этот email. Повторите через ${perEmail.retryAfter} с.`, 429)
      }
      return apiResponse({ ok: true })
    }
    code = await createAndSendCode(db, email.value, purpose)
  }

  const expose = process.env.NODE_ENV !== "production" && !isEmailConfigured()
  return apiResponse({ ok: true, ...(expose && code ? { dev_code: code } : {}) })
}