import { getDb } from "@/db"
import { getAuthUser, apiResponse } from "@/lib/auth"

// "Паблики для вас" — most-subscribed communities the viewer hasn't joined yet.
export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()

  const communities = await db.all(`
    SELECT c.id, c.slug, c.name, c.description, c.icon, c.color, c.avatar,
      (SELECT COUNT(*) FROM community_subscriptions cs WHERE cs.community_id = c.id) as subscriber_count
    FROM communities c
    WHERE (? IS NULL OR NOT EXISTS (SELECT 1 FROM community_subscriptions cs WHERE cs.community_id = c.id AND cs.user_id = ?))
    ORDER BY subscriber_count DESC, c.created_at DESC
    LIMIT 6
  `, [auth?.userId ?? null, auth?.userId ?? null])

  return apiResponse({ communities })
}