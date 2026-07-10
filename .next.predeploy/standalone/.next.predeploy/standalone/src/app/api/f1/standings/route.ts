import { getConstructorStandings, getDriverStandings } from "@/lib/f1/jolpica"
import { apiError, apiResponse } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const season = url.searchParams.get("season") || "current"
    const [drivers, constructors] = await Promise.all([
      getDriverStandings(season),
      getConstructorStandings(season),
    ])

    return apiResponse({
      season: drivers.season || constructors.season || season,
      round: drivers.round || constructors.round || 0,
      drivers: drivers.drivers,
      constructors: constructors.constructors,
    })
  } catch {
    return apiError("Не удалось загрузить зачёты F1", 502)
  }
}
