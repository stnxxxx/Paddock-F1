import { getDb } from "@/db"
import { fetchAllStandings, fetchLastRaceResults, fetchNextRace } from "@/lib/f1-data"
import { apiResponse } from "@/lib/auth"

async function fallbackStandings() {
  const db = getDb()
  const drivers = await db.all("SELECT pos, driver, team, color, pts FROM standings_drivers ORDER BY pos")
  const constructors = await db.all("SELECT pos, team, color, pts FROM standings_constructors ORDER BY pos")

  return {
    drivers,
    constructors,
    season: "2026",
    round: 0,
    totalRaces: 24,
    races: [],
    lastRace: null,
    nextRace: null,
    source: "local-fallback",
  }
}

export async function GET() {
  try {
    const [standings, lastRace, nextRace] = await Promise.all([
      fetchAllStandings(),
      fetchLastRaceResults(),
      fetchNextRace(),
    ])

    return apiResponse({
      ...standings,
      lastRace,
      nextRace: nextRace ? {
        name: nextRace.raceName,
        circuit: nextRace.Circuit?.circuitName,
        country: nextRace.Circuit?.Location?.country,
        date: nextRace.date,
        round: nextRace.round,
      } : null,
      source: "jolpica",
    })
  } catch {
    return apiResponse(await fallbackStandings())
  }
}