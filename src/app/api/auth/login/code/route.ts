import { getDb } from "@/db"
import { createToken, apiResponse, apiError, setAuthCookie } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { validateEmail } from "@/lib/validation"
import { verifyAndConsumeCode } from "@/lib/email-codes"

interface UserRow {
  id: string
  username: string
  display_name: string | null
  email: string
  team: string | null
  driver: string | null
  role: string
  avatar: string | null
  cover: string | null
  bio: string | null
  karma: number
  onboarded: number
  banned: number
}

interface FlairRow {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export async function POST(req: Request) {
  const limited = rateLimitGuard(req, "login-code", 10, 15 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const email = validateEmail(body.email)
  if (!email.ok) return apiError(email.error)

  const db = getDb()
  const verified = await verifyAndConsumeCode(db, email.value, "login", String(body.code || ""))
  if (!verified.ok) return apiError(verified.error || "Неверный код", 400)

  const user = await db.get(
    "SELECT id, username, display_name, email, team, driver, role, avatar, cover, bio, karma, onboarded, banned FROM users WHERE email = $1",
    [email.value]
  ) as UserRow | undefined
  if (!user) return apiError("Аккаунт не найден", 404)
  if (user.banned) return apiError("Аккаунт заблокирован", 403)

  const flairs = await db.all(
    "SELECT f.id, f.name, f.icon, f.color FROM flairs f JOIN user_flairs uf ON uf.flair_id = f.id WHERE uf.user_id = $1",
    [user.id]
  ) as FlairRow[]

  const token = await createToken({ userId: user.id, username: user.username })
  await setAuthCookie(token)

  return apiResponse({
    user: {
      id: user.id, username: user.username, display_name: user.display_name, email: user.email,
      team: user.team, driver: user.driver, role: user.role, avatar: user.avatar, cover: user.cover,
      bio: user.bio, karma: user.karma, onboarded: user.onboarded, flairs: flairs || [],
    },
  })
}