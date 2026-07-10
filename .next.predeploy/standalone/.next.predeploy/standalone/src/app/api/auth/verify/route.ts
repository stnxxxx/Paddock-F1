import { getDb } from "@/db"
import { apiResponse, apiError } from "@/lib/auth"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) return apiError("Токен обязателен", 400)

  const db = getDb()
  const user = await db.get("SELECT id FROM users WHERE verification_token = $1", [token]) as any
  if (!user) return apiError("Неверный токен", 404)

  await db.run("UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = $1", [user.id])
  return apiResponse({ ok: true, message: "Email подтверждён" })
}