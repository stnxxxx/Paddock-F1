import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"
import { getDb } from "@/db"

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { flairIds } = await req.json()
  const db = getDb()

  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM user_flairs WHERE user_id = $1", [auth.userId])
    if (flairIds && flairIds.length > 0) {
      for (const fid of flairIds) {
        await tx.run(
          "INSERT INTO user_flairs (user_id, flair_id) VALUES ($1, $2) ON CONFLICT (user_id, flair_id) DO NOTHING",
          [auth.userId, fid]
        )
      }
    }
  })

  const user = await db.get(
    "SELECT id, username, email, team, driver, karma FROM users WHERE id = $1",
    [auth.userId]
  ) as any

  const flairs = await db.all(
    "SELECT f.id, f.name, f.icon, f.color FROM flairs f JOIN user_flairs uf ON uf.flair_id = f.id WHERE uf.user_id = $1",
    [auth.userId]
  ) as any[]

  return apiResponse({ user: { ...user, flairs: flairs || [] } })
}