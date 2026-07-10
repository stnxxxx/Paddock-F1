import { getCalendar } from "@/lib/f1/jolpica"
import { apiError, apiResponse } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const season = Number(url.searchParams.get("season") || new Date().getFullYear())
    const races = await getCalendar(season)
    return apiResponse({ season, races })
  } catch {
    return apiError("Не удалось загрузить календарь F1", 502)
  }
}
