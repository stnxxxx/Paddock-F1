import { getDb } from "@/db"
import { getAuthUser, apiResponse } from "@/lib/auth"

export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()

  const all = await db.all("SELECT * FROM achievements ORDER BY id")

  if (!auth) return apiResponse({ achievements: all, earned: [] })

  const earned = await db.all(`
    SELECT a.* FROM achievements a
    JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
  `, [auth.userId])

  return apiResponse({ achievements: all, earned })
}