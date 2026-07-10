import { getQualifyingResults, getRaceResults } from "@/lib/f1/jolpica"
import { apiError, apiResponse } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ season: string; round: string }> }) {
  const { season, round } = await params
  const seasonNum = Number(season)
  const roundNum = Number(round)

  if (!Number.isFinite(seasonNum) || !Number.isFinite(roundNum)) {
    return apiError("Некорректный сезон или этап", 400)
  }

  try {
    const [race, qualifying] = await Promise.all([
      getRaceResults(seasonNum, roundNum),
      getQualifyingResults(seasonNum, roundNum).catch(() => ({ race: null, results: [] })),
    ])

    return apiResponse({
      season: seasonNum,
      round: roundNum,
      race: race.race || qualifying.race,
      results: race.results,
      qualifying: qualifying.results,
    })
  } catch {
    return apiError("Не удалось загрузить данные Гран-при", 502)
  }
}
