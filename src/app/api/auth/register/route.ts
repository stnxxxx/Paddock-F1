import { getDb } from "@/db"
import { createToken, apiResponse, apiError, setAuthCookie } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { validateEmail, validateUsername, validatePassword } from "@/lib/validation"
import { verifyAndConsumeCode } from "@/lib/email-codes"
import { v4 as uuid } from "uuid"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const limited = rateLimitGuard(req, "register", 5, 60 * 60 * 1000)
    if (limited) return limited

    const body = await req.json()

    const username = validateUsername(body.username)
    if (!username.ok) return apiError(username.error)
    const email = validateEmail(body.email)
    if (!email.ok) return apiError(email.error)
    const password = validatePassword(body.password)
    if (!password.ok) return apiError(password.error)

    const db = getDb()

    const verified = await verifyAndConsumeCode(db, email.value, "register", String(body.code || ""))
    if (!verified.ok) return apiError(verified.error || "Неверный код", 400)

    const hash = bcrypt.hashSync(password.value, 10)
    const id = uuid()

    await db.run(
      "INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)",
      [id, username.value, email.value, hash]
    )

    const token = await createToken({ userId: id, username: username.value })
    await setAuthCookie(token)

    return apiResponse({ user: { id, username: username.value, display_name: null, email: email.value, team: null, driver: null, role: "user", avatar: null, cover: null, bio: null, karma: 0, onboarded: 0, flairs: [] } })
  } catch (e: any) {
    if (e.message?.includes("UNIQUE") || e.code === "23505") return apiError("Имя или email уже заняты", 409)
    return apiError("Ошибка регистрации", 500)
  }
}