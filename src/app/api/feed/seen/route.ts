import { getDb } from "@/db"
import { getAuthUser, apiResponse } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"

// Batch-marks posts as seen so the "Для вас" ranker demotes them next time.
// Body: { ids: string[] }. No-op for guests.
export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiResponse({ ok: true })

  const limited = rateLimitGuard(req, "feed-seen", 240, 60 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x: unknown) => typeof x === "string").slice(0, 100)
  if (!ids.length) return apiResponse({ ok: true })

  const db = getDb()
  await db.transaction(async (db) => {
    for (const id of ids) {
      await db.run("INSERT INTO feed_seen (user_id, post_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [auth.userId, id])
    }
  })

  // Opportunistic cleanup so the table doesn't grow unbounded.
  if (Math.random() < 0.05) {
    await db.run("DELETE FROM feed_seen WHERE seen_at < NOW() - INTERVAL '7 days'")
  }
  return apiResponse({ ok: true })
}