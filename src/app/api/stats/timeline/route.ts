import {
  fetchSeasonRaces,
  fetchRaceResults,
  fetchQualifyingResults,
  fetchDriverStandingsByYear,
  fetchConstructorStandingsByYear,
  getF1TeamColor,
} from "@/lib/f1-data"
import { apiResponse, apiError } from "@/lib/auth"

const FORM_LENGTH = 5

// A driver counts as classified (not a DNF) when they took the flag — whether on
// the lead lap ("Finished"), lapped ("Lapped"), or a laps-behind variant
// ("+1 Lap"). Everything else (Accident, Engine, Retired, Disqualified, …) is a DNF.
function isFinished(status: string): boolean {
  return status === "Finished" || status === "Lapped" || /^\+\d+ Lap/.test(status)
}

interface RecordEntry {
  code: string
  name: string
  team: string
  color: string
  value: number
}

/**
 * Season "engine": pulls every completed round's race results and derives the
 * championship progression (cumulative points per round), each driver's recent
 * form, and the season record leaderboards. One request per completed round,
 * all cached upstream in fetchRaceResults.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const year = parseInt(url.searchParams.get("year") || "") || new Date().getFullYear()

    const [schedule, driverStandings, constructorStandings] = await Promise.all([
      fetchSeasonRaces(year),
      fetchDriverStandingsByYear(year),
      fetchConstructorStandingsByYear(year),
    ])

    const now = new Date()
    const completed = schedule.races
      .filter((r) => new Date(r.date + "T23:59:59Z") < now)
      .sort((a, b) => a.round - b.round)

    const [roundResults, roundQualifying] = await Promise.all([
      Promise.all(completed.map((r) => fetchRaceResults(year, r.round).catch(() => null))),
      Promise.all(completed.map((r) => fetchQualifyingResults(year, r.round).catch(() => null))),
    ])

    // Per-round points, keyed by driver code / team — aligned to `completed`.
    const codes = new Set<string>()
    const teams = new Set<string>()
    const meta = new Map<string, { name: string; team: string; color: string }>()
    const perRoundDriver: Array<Map<string, number>> = []
    const perRoundTeam: Array<Map<string, number>> = []
    const roundLabels: string[] = []

    const formByDriver = new Map<string, number[]>() // finishing position, 0 = DNF
    const wins = new Map<string, number>()
    const podiums = new Map<string, number>()
    const poles = new Map<string, number>()
    const fastestLaps = new Map<string, number>()
    const dnfs = new Map<string, number>()
    const finishSum = new Map<string, number>()
    const finishCount = new Map<string, number>()

    const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) || 0) + by)

    completed.forEach((race, idx) => {
      roundLabels.push(`R${race.round}`)
      const dMap = new Map<string, number>()
      const tMap = new Map<string, number>()
      const results = roundResults[idx]?.results || []

      for (const res of results) {
        const code = res.driverCode
        const team = res.constructorName
        codes.add(code)
        teams.add(team)
        if (!meta.has(code)) {
          meta.set(code, {
            name: res.driverName,
            team,
            color: getF1TeamColor(team),
          })
        }

        const pts = Number(res.points) || 0
        bump(dMap, code, pts)
        bump(tMap, team, pts)

        const pos = Number(res.position) || 99
        const finished = isFinished(res.status)
        if (!formByDriver.has(code)) formByDriver.set(code, [])
        formByDriver.get(code)!.push(finished ? pos : 0)

        if (pos === 1) bump(wins, code)
        if (pos <= 3) bump(podiums, code)
        if (res.fastestLap?.rank === "1") bump(fastestLaps, code)
        if (!finished) bump(dnfs, code)
        if (finished) {
          bump(finishSum, code, pos)
          bump(finishCount, code)
        }
      }

      // Pole = qualifying P1 (accurate — independent of grid penalties).
      const poleman = (roundQualifying[idx]?.results || []).find(
        (q: { position: string; driverCode?: string }) => q.position === "1"
      )
      if (poleman?.driverCode) bump(poles, poleman.driverCode)

      perRoundDriver.push(dMap)
      perRoundTeam.push(tMap)
    })

    // Cumulative series aligned to roundLabels.
    const cumulative = (
      keys: Set<string>,
      perRound: Array<Map<string, number>>
    ) => {
      const out: Record<string, number[]> = {}
      for (const k of keys) {
        let sum = 0
        out[k] = perRound.map((m) => (sum += m.get(k) || 0))
      }
      return out
    }

    const driverCum = cumulative(codes, perRoundDriver)
    const teamCum = cumulative(teams, perRoundTeam)

    const driverSeries = driverStandings.standings.map((d) => ({
      code: d.driverCode,
      name: d.driverName,
      team: d.team,
      color: d.color,
      pts: d.pts,
      wins: d.wins,
      points: driverCum[d.driverCode] || [],
      form: (formByDriver.get(d.driverCode) || []).slice(-FORM_LENGTH),
    }))

    const teamSeries = constructorStandings.standings.map((c) => ({
      team: c.team,
      color: c.color,
      pts: c.pts,
      wins: c.wins,
      points: teamCum[c.team] || [],
    }))

    const toRecord = (m: Map<string, number>): RecordEntry[] =>
      [...m.entries()]
        .map(([code, value]) => {
          const info = meta.get(code)
          return {
            code,
            name: info?.name || code,
            team: info?.team || "",
            color: info?.color || "#888",
            value,
          }
        })
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)

    const avgFinish: RecordEntry[] = [...finishCount.entries()]
      .filter(([, n]) => n >= Math.max(1, Math.floor(completed.length / 2)))
      .map(([code, n]) => {
        const info = meta.get(code)
        return {
          code,
          name: info?.name || code,
          team: info?.team || "",
          color: info?.color || "#888",
          value: Math.round(((finishSum.get(code) || 0) / n) * 10) / 10,
        }
      })
      .sort((a, b) => a.value - b.value)
      .slice(0, 8)

    return apiResponse({
      season: year,
      round: completed.length,
      totalRaces: schedule.races.length,
      calendar: schedule.races,
      rounds: roundLabels,
      drivers: driverSeries,
      constructors: teamSeries,
      records: {
        wins: toRecord(wins),
        podiums: toRecord(podiums),
        poles: toRecord(poles),
        fastestLaps: toRecord(fastestLaps),
        dnfs: toRecord(dnfs),
        avgFinish,
      },
      source: "jolpica",
    })
  } catch {
    return apiError("Не удалось загрузить статистику сезона", 502)
  }
}
