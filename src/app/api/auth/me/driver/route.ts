import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { getDb } from "@/db"

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { driver } = await req.json()
  const db = getDb()
  await db.run("UPDATE users SET driver = $1 WHERE id = $2", [driver || null, auth.userId])

  const user = await db.get(
    "SELECT id, username, email, team, driver, role, karma FROM users WHERE id = $1",
    [auth.userId]
  ) as any

  return apiResponse({ user })
}