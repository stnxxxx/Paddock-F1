import {
  F1PitStop,
  F1QualifyingResult,
  F1Race,
  F1RaceResult,
  F1StandingConstructor,
  F1StandingDriver,
} from "./types"
import { getF1TeamColor, normalizeDriverCode, normalizeTeam } from "./normalizer"
import { memoized } from "./cache"

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"

interface MRData {
  RaceTable?: { season?: string; round?: string; Races?: JolpicaRace[] }
  StandingsTable?: { season?: string; round?: string; StandingsLists?: JolpicaStandingsList[] }
}

interface JolpicaRace {
  season: string
  round: string
  raceName: string
  Circuit?: { circuitName?: string; Location?: { locality?: string; country?: string } }
  date: string
  time?: string
  Results?: JolpicaRaceResult[]
  SprintResults?: JolpicaRaceResult[]
  QualifyingResults?: JolpicaQualifyingResult[]
  PitStops?: JolpicaPitStop[]
}

interface JolpicaPitStop {
  driverId: string
  lap: string
  stop: string
  time?: string
  duration?: string
}

interface JolpicaStandingsList {
  season: string
  round: string
  DriverStandings?: JolpicaDriverStanding[]
  ConstructorStandings?: JolpicaConstructorStanding[]
}

interface JolpicaDriverStanding {
  position: string
  points: string
  wins: string
  Driver: { driverId?: string; code?: string; givenName: string; familyName: string }
  Constructors: Array<{ constructorId?: string; name: string }>
}

interface JolpicaConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: { constructorId?: string; name: string }
}

interface JolpicaRaceResult {
  position: string
  grid?: string
  points?: string
  laps?: string
  status?: string
  Time?: { time?: string }
  Driver: { driverId?: string; code?: string; givenName: string; familyName: string }
  Constructor: { constructorId?: string; name: string }
  FastestLap?: { rank: string; Time?: { time?: string } }
}

interface JolpicaQualifyingResult {
  position: string
  Driver: { driverId?: string; code?: string; givenName: string; familyName: string }
  Constructor: { constructorId?: string; name: string }
  Q1?: string
  Q2?: string
  Q3?: string
}

async function fetchJolpica(path: string, revalidate = 300): Promise<MRData> {
  const res = await fetch(`${JOLPICA_BASE}/${path.replace(/^\/+/, "")}`, {
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`Jolpica API returned ${res.status}`)
  const json = await res.json()
  return json.MRData || {}
}

function getClassifiedRaceTime(status?: string, time?: string): string | undefined {
  if (!time) return undefined
  return status === "Finished" ? time : undefined
}

function mapRaceResult(r: JolpicaRaceResult): F1RaceResult {
  const team = normalizeTeam(r.Constructor?.name)
  return {
    position: r.position,
    grid: r.grid,
    driverId: r.Driver?.driverId,
    driverCode: normalizeDriverCode(r.Driver),
    driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
    constructorName: team,
    constructorId: r.Constructor?.constructorId,
    laps: r.laps,
    status: r.status,
    time: getClassifiedRaceTime(r.status, r.Time?.time),
    points: r.points,
    fastestLap: r.FastestLap ? { rank: r.FastestLap.rank, time: r.FastestLap.Time?.time || "" } : null,
  }
}

function mapRace(race: JolpicaRace): F1Race {
  return {
    season: Number(race.season),
    round: Number(race.round),
    name: race.raceName,
    circuit: race.Circuit?.circuitName || "",
    locality: race.Circuit?.Location?.locality,
    country: race.Circuit?.Location?.country || "",
    date: race.date,
    time: race.time,
  }
}

export async function getCalendar(season = new Date().getFullYear()): Promise<F1Race[]> {
  return memoized(`f1:jolpica:calendar:${season}`, 60 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}.json?limit=100`, 3600)
    return (data.RaceTable?.Races || []).map(mapRace)
  })
}

export async function getCurrentCalendar(): Promise<F1Race[]> {
  return memoized("f1:jolpica:calendar:current", 60 * 60 * 1000, async () => {
    const data = await fetchJolpica("current.json?limit=100", 3600)
    return (data.RaceTable?.Races || []).map(mapRace)
  })
}

export async function getNextRace(): Promise<F1Race | null> {
  return memoized("f1:jolpica:next", 10 * 60 * 1000, async () => {
    const data = await fetchJolpica("current/next.json", 600)
    return data.RaceTable?.Races?.[0] ? mapRace(data.RaceTable.Races[0]) : null
  })
}

export async function getDriverStandings(season = "current"): Promise<{ season?: string; round?: number; drivers: F1StandingDriver[] }> {
  return memoized(`f1:jolpica:driver-standings:${season}`, 5 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/driverStandings.json?limit=100`, 300)
    const list = data.StandingsTable?.StandingsLists?.[0]
    return {
      season: list?.season,
      round: list?.round ? Number(list.round) : undefined,
      drivers: (list?.DriverStandings || []).map((d) => {
        const team = normalizeTeam(d.Constructors[0]?.name)
        return {
          pos: Number(d.position),
          driverCode: normalizeDriverCode(d.Driver),
          driverId: d.Driver.driverId,
          driverName: `${d.Driver.givenName} ${d.Driver.familyName}`,
          team,
          constructorId: d.Constructors[0]?.constructorId,
          color: getF1TeamColor(team),
          pts: Number(d.points),
          wins: Number(d.wins),
        }
      }),
    }
  })
}

export async function getConstructorStandings(season = "current"): Promise<{ season?: string; round?: number; constructors: F1StandingConstructor[] }> {
  return memoized(`f1:jolpica:constructor-standings:${season}`, 5 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/constructorStandings.json?limit=100`, 300)
    const list = data.StandingsTable?.StandingsLists?.[0]
    return {
      season: list?.season,
      round: list?.round ? Number(list.round) : undefined,
      constructors: (list?.ConstructorStandings || []).map((c) => {
        const team = normalizeTeam(c.Constructor.name)
        return {
          pos: Number(c.position),
          constructorId: c.Constructor.constructorId,
          team,
          color: getF1TeamColor(team),
          pts: Number(c.points),
          wins: Number(c.wins),
        }
      }),
    }
  })
}

export async function getRaceResults(season: number, round: number): Promise<{ race: F1Race | null; results: F1RaceResult[] }> {
  return memoized(`f1:jolpica:race-results:${season}:${round}`, 5 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/${round}/results.json?limit=100`, 300)
    const race = data.RaceTable?.Races?.[0]
    return {
      race: race ? mapRace(race) : null,
      results: (race?.Results || []).map(mapRaceResult),
    }
  })
}

export async function getSprintResults(season: number, round: number): Promise<{ race: F1Race | null; results: F1RaceResult[] }> {
  return memoized(`f1:jolpica:sprint:${season}:${round}`, 60 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/${round}/sprint.json?limit=100`, 3600)
    const race = data.RaceTable?.Races?.[0]
    return {
      race: race ? mapRace(race) : null,
      results: (race?.SprintResults || []).map(mapRaceResult),
    }
  })
}

export async function getPitStops(season: number, round: number): Promise<F1PitStop[]> {
  return memoized(`f1:jolpica:pitstops:${season}:${round}`, 60 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/${round}/pitstops.json?limit=200`, 3600)
    const race = data.RaceTable?.Races?.[0]
    return (race?.PitStops || []).map((p) => ({
      driverId: p.driverId,
      lap: Number(p.lap),
      stop: Number(p.stop),
      duration: p.duration || "",
      durationSec: Number(p.duration) || 0,
    }))
  })
}

export async function getQualifyingResults(season: number, round: number): Promise<{ race: F1Race | null; results: F1QualifyingResult[] }> {
  return memoized(`f1:jolpica:qualifying:${season}:${round}`, 5 * 60 * 1000, async () => {
    const data = await fetchJolpica(`${season}/${round}/qualifying.json?limit=100`, 300)
    const race = data.RaceTable?.Races?.[0]
    return {
      race: race ? mapRace(race) : null,
      results: (race?.QualifyingResults || []).map((q) => ({
        position: q.position,
        driverCode: normalizeDriverCode(q.Driver),
        driverName: `${q.Driver.givenName} ${q.Driver.familyName}`,
        constructorName: normalizeTeam(q.Constructor?.name),
        q1: q.Q1,
        q2: q.Q2,
        q3: q.Q3,
      })),
    }
  })
}
