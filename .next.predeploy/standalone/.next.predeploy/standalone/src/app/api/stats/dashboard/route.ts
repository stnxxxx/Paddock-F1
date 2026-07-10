import {
  fetchAllStandings,
  fetchLastRaceResults,
  fetchNextRace,
  fetchRaceResults,
  fetchQualifyingResults,
} from "@/lib/f1-data"
import { getDb } from "@/db"
import { apiResponse } from "@/lib/auth"

async function fallbackDashboard() {
  const db = getDb()
  const driverStandings = await db.all("SELECT pos, driver, team, color, pts FROM standings_drivers ORDER BY pos")
  const constructorStandings = await db.all("SELECT pos, team, color, pts FROM standings_constructors ORDER BY pos")

  return {
    season: 2026,
    round: 0,
    totalRaces: 24,
    driverStandings,
    constructorStandings,
    raceCalendar: [],
    nextRace: null,
    lastRace: null,
    lastQualifying: null,
    source: "local-fallback",
  }
}

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const [standings, lastRace, nextRace] = await Promise.all([
      fetchAllStandings(),
      fetchLastRaceResults(),
      fetchNextRace(),
    ])

    const season = parseInt(standings.season || String(currentYear))
    const round = standings.round || 0

    let lastRaceDetails = null
    let lastQualifying = null
    if (lastRace) {
      const roundNum = parseInt(lastRace.round)
      try {
        const [raceRes, qualRes] = await Promise.all([
          fetchRaceResults(season, roundNum),
          fetchQualifyingResults(season, roundNum),
        ])
        lastRaceDetails = raceRes
        lastQualifying = qualRes
      } catch {
        lastRaceDetails = lastRace
      }
    }

    return apiResponse({
      season,
      round,
      totalRaces: standings.totalRaces,
      driverStandings: standings.drivers,
      constructorStandings: standings.constructors,
      raceCalendar: standings.races,
      nextRace: nextRace
        ? {
            name: nextRace.raceName,
            circuit: nextRace.Circuit?.circuitName,
            country: nextRace.Circuit?.Location?.country,
            date: nextRace.date,
            round: parseInt(nextRace.round),
          }
        : null,
      lastRace: lastRaceDetails,
      lastQualifying,
      source: "jolpica",
    })
  } catch {
    return apiResponse(fallbackDashboard())
  }
}