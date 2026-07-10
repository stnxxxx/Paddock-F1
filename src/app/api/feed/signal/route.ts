import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"

const TYPES = new Set(["mute_author", "mute_tag", "boost_tag"])

// Records "Для вас" feedback: mute an author/tag, or boost a topic.
// Body: { type: mute_author|mute_tag|boost_tag, value: string, remove?: boolean }
export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)

  const limited = rateLimitGuard(req, "feed-signal", 120, 60 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const type = String(body.type || "")
  const value = String(body.value || "").trim().slice(0, 64)
  if (!TYPES.has(type) || !value) return apiError("Некорректный сигнал")

  const db = getDb()
  if (body.remove === true) {
    await db.run("DELETE FROM feed_signals WHERE user_id = ? AND type = ? AND value = ?", [auth.userId, type, value])
  } else {
    await db.run("INSERT INTO feed_signals (user_id, type, value) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [auth.userId, type, value])
  }
  return apiResponse({ ok: true })
}