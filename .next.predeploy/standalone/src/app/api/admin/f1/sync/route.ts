import { revalidateTag } from "next/cache"
import { apiError, apiResponse, requireAdmin } from "@/lib/auth"
import { clearF1Cache } from "@/lib/f1/cache"
import { getCurrentCalendar, getDriverStandings, getConstructorStandings } from "@/lib/f1/jolpica"
import { getLiveSnapshot } from "@/lib/f1/live"
import { F1_CACHE_TAG } from "@/lib/f1-data"

export async function POST() {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error

  try {
    clearF1Cache()
    // Bust the Next fetch cache that powers /stats (timeline + dashboard) so the
    // next request refetches fresh from Jolpica instead of serving stale data.
    revalidateTag(F1_CACHE_TAG, "max")
    const [calendar, drivers, constructors, live] = await Promise.all([
      getCurrentCalendar(),
      getDriverStandings("current"),
      getConstructorStandings("current"),
      getLiveSnapshot(),
    ])

    return apiResponse({
      ok: true,
      syncedAt: new Date().toISOString(),
      calendar: calendar.length,
      drivers: drivers.drivers.length,
      constructors: constructors.constructors.length,
      liveMode: live.mode,
      sources: live.sources,
    })
  } catch {
    return apiError("Не удалось синхронизировать F1-данные", 502)
  }
}
