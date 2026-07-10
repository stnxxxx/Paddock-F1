import { getDb } from "@/db"
import { apiResponse, getAuthUser } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { v4 as uuid } from "uuid"

const TYPES = new Set(["pageview", "session_start", "click", "scroll"])

interface RawEvent {
  type?: unknown
  vid?: unknown
  sid?: unknown
  path?: unknown
  referrer?: unknown
  data?: unknown
}

function readConsent(req: Request): { analytics?: boolean; behavior?: boolean; preferences?: boolean } {
  const raw = req.headers.get("cookie") || ""
  const entry = raw.split(/;\s*/).find((c) => c.startsWith("paddock_consent="))
  if (!entry) return {}
  try {
    return JSON.parse(decodeURIComponent(entry.slice("paddock_consent=".length)))
  } catch {
    return {}
  }
}

function deviceFromUA(ua: string): string {
  return /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop"
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null)

// First-party analytics ingestion. Stores nothing unless the visitor consented to
// analytics; click/scroll require the additional "behavior" consent. Body is a single
// event or { events: [...] }.
export async function POST(req: Request) {
  const limited = rateLimitGuard(req, "track", 300, 60 * 1000)
  if (limited) return limited

  const consent = readConsent(req)
  if (!consent.analytics) return apiResponse({ ok: true, ignored: true })

  const body = await req.json().catch(() => ({}))
  const events: RawEvent[] = Array.isArray(body.events) ? body.events : [body]
  const ua = req.headers.get("user-agent") || ""
  const device = deviceFromUA(ua)
  const auth = await getAuthUser()

  const db = getDb()
  let stored = 0
  await db.transaction(async (db) => {
    for (const e of events.slice(0, 50)) {
      const type = String(e.type || "")
      if (!TYPES.has(type)) continue
      if ((type === "click" || type === "scroll") && !consent.behavior) continue
      await db.run(
        "INSERT INTO analytics_events (id, visitor_id, session_id, user_id, type, path, referrer, device, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [uuid(), s(e.vid, 64), s(e.sid, 64), auth?.userId || null, type, s(e.path, 512), s(e.referrer, 512), device, e.data != null ? JSON.stringify(e.data).slice(0, 1000) : null]
      )
      stored++
    }
  })

  return apiResponse({ ok: true, stored })
}