import { getDb } from "@/db"
import { apiError, apiResponse, apiBanGuard, getAuthUser } from "@/lib/auth"
import { getCommunityBySlug } from "@/lib/communities"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const existing = await db.get("SELECT 1 FROM community_subscriptions WHERE community_id = ? AND user_id = ?", [community.id, auth.userId])
  if (existing) {
    await db.run("DELETE FROM community_subscriptions WHERE community_id = ? AND user_id = ?", [community.id, auth.userId])
  } else {
    await db.run("INSERT INTO community_subscriptions (community_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [community.id, auth.userId])
  }
  const count = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM community_subscriptions WHERE community_id = ?", [community.id]))?.c ?? 0
  return apiResponse({ subscribed: !existing, subscriber_count: count })
}