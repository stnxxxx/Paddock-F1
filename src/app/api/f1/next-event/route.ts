import { getSessions } from "@/lib/f1/openf1"
import { apiResponse, apiError } from "@/lib/auth"

// The nearest upcoming practice/qualifying session that falls before the next
// race. Returns { event: null } once only the race remains on the schedule —
// the live page hides its secondary countdown in that case.
export async function GET() {
  const year = new Date().getFullYear()
  try {
    const sessions = await getSessions(year)
    const now = Date.now()
    const upcoming = sessions
      .filter((s) => s.date_start && Date.parse(s.date_start) > now)
      .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))

    const nextRace = upcoming.find((s) => s.session_type === "Race")
    const raceMs = nextRace ? Date.parse(nextRace.date_start) : Infinity

    const ev = upcoming.find(
      (s) =>
        (s.session_type === "Practice" || s.session_type === "Qualifying") &&
        Date.parse(s.date_start) < raceMs
    )

    return apiResponse({
      event: ev ? { name: ev.session_name, type: ev.session_type, date: ev.date_start } : null,
    })
  } catch {
    return apiError("Не удалось загрузить расписание", 502)
  }
}
