import { getSessions } from "@/lib/f1/openf1"
import { apiError, apiResponse } from "@/lib/auth"

// Finished sessions for a season (newest first) — feeds the stats session picker.
// Only sessions that have ended are returned, since timing data exists for those.
export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear()
  try {
    const sessions = await getSessions(year)
    const now = Date.now()
    const list = sessions
      .filter((s) => s.date_end && Date.parse(s.date_end) <= now)
      .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))
      .map((s) => ({
        key: s.session_key,
        name: s.session_name,
        type: s.session_type,
        country: s.country_name ?? s.location ?? "",
        circuit: s.circuit_short_name ?? "",
        date: s.date_start,
      }))
    return apiResponse({ year, sessions: list })
  } catch {
    return apiError("Не удалось загрузить сессии", 502)
  }
}
