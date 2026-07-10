import { getDb } from "@/db"
import { getAuthUser, apiResponse } from "@/lib/auth"

// "Кого читать" — active users not yet followed, biased toward the viewer's team then karma.
export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()
  const me = auth
    ? (await db.get("SELECT team FROM users WHERE id = ?", [auth.userId]) as { team: string | null } | undefined)
    : undefined
  const team = me?.team ?? null

  const users = await db.all(`
    SELECT u.id, u.username, u.display_name, u.team, u.avatar, u.karma,
      (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) as followers_count
    FROM users u
    WHERE u.banned = 0
      AND (? IS NULL OR u.id != ?)
      AND (? IS NULL OR NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followed_id = u.id))
      AND EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.deleted = 0)
    ORDER BY
      CASE WHEN ? IS NOT NULL AND u.team = ? THEN 1 ELSE 0 END DESC,
      u.karma DESC
    LIMIT 6
  `, [auth?.userId ?? null, auth?.userId ?? null, auth?.userId ?? null, auth?.userId ?? null, team, team])

  return apiResponse({ users })
}