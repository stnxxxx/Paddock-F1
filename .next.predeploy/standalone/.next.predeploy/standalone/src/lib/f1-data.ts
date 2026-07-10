const API = "https://api.jolpi.ca/ergast/f1"

/** Cache tag for all Jolpica-sourced data. `revalidateTag(F1_CACHE_TAG)` forces a refresh. */
export const F1_CACHE_TAG = "f1-data"

const CONSTRUCTOR_MAP: Record<string, string> = {
  mercedes: "Mercedes",
  ferrari: "Ferrari",
  mclaren: "McLaren",
  red_bull: "Red Bull",
  alpine: "Alpine F1 Team",
  rb: "Racing Bulls",
  haas: "Haas F1 Team",
  williams: "Williams",
  audi: "Audi",
  aston_martin: "Aston Martin",
  cadillac: "Cadillac F1 Team",
}

const NORMALIZE_TEAM: Record<string, string> = {
  "Alpine F1 Team": "Alpine",
  "Haas F1 Team": "Haas",
  "Cadillac F1 Team": "Cadillac",
  "RB F1 Team": "Racing Bulls",
  "Aston Martin": "Aston Martin",
}

export function normalizeTeam(name: string): string {
  return NORMALIZE_TEAM[name] || name
}

const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#00d2be",
  Ferrari: "#dc0000",
  McLaren: "#ff8000",
  "Red Bull": "#1e41ff",
  Alpine: "#0093cc",
  "Racing Bulls": "#6692ff",
  Haas: "#b6babd",
  Williams: "#005aff",
  Audi: "#e10600",
  "Aston Martin": "#006f62",
  Cadillac: "#003d7c",
}

export function getF1TeamColor(team: string): string {
  return TEAM_COLORS[team] || "#888"
}

function getClassifiedRaceTime(status?: string, time?: string): string | undefined {
  if (!time) return undefined
  return status === "Finished" ? time : undefined
}

interface DriverStanding {
  position: string; points: string; wins: string
  Driver: { code: string; givenName: string; familyName: string }
  Constructors: [{ name: string }]
}

interface ConstructorStanding {
  position: string; points: string; wins: string
  Constructor: { name: string }
}

interface Race {
  season: string; round: string; raceName: string
  Circuit: { circuitName: string; Location: { locality: string; country: string } }
  date: string; time: string
  Results?: any[]
  QualifyingResults?: any[]
}

export async function fetchDriverStandings() {
  const url = `${API}/current/driverStandings.json`
  const res = await fetch(url, { next: { revalidate: 300, tags: [F1_CACHE_TAG] } })
  const j = await res.json()
  const list = j?.MRData?.StandingsTable?.StandingsLists?.[0]
  return {
    season: list?.season,
    round: parseInt(list?.round || "0"),
    standings: (list?.DriverStandings || []) as DriverStanding[],
  }
}

export async function fetchConstructorStandings() {
  const url = `${API}/current/constructorStandings.json`
  const res = await fetch(url, { next: { revalidate: 300, tags: [F1_CACHE_TAG] } })
  const j = await res.json()
  const list = j?.MRData?.StandingsTable?.StandingsLists?.[0]
  return {
    season: list?.season,
    round: parseInt(list?.round || "0"),
    standings: (list?.ConstructorStandings || []) as ConstructorStanding[],
  }
}

export async function fetchRaceSchedule() {
  const url = `${API}/current.json`
  const res = await fetch(url, { next: { revalidate: 3600, tags: [F1_CACHE_TAG] } })
  const j = await res.json()
  const races = (j?.MRData?.RaceTable?.Races || []) as Race[]
  return {
    season: j?.MRData?.RaceTable?.season,
    races,
  }
}

export async function fetchNextRace() {
  const url = `${API}/current/next.json`
  const res = await fetch(url, { next: { revalidate: 600, tags: [F1_CACHE_TAG] } })
  const j = await res.json()
  const races = j?.MRData?.RaceTable?.Races || []
  return races[0] as Race | undefined
}

export async function fetchLastRaceResults() {
  const url = `${API}/current/last/results.json`
  const res = await fetch(url, { next: { revalidate: 300, tags: [F1_CACHE_TAG] } })
  const j = await res.json()
  const race = j?.MRData?.RaceTable?.Races?.[0]
  if (!race) return null
  return {
    raceName: race.raceName,
    round: race.round,
    date: race.date,
    results: (race.Results || []).map((r: any) => ({
      position: r.position,
      driverCode: r.Driver?.code,
      driverName: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
      constructorId: r.Constructor?.constructorId,
      constructorName: normalizeTeam(CONSTRUCTOR_MAP[r.Constructor?.constructorId] || r.Constructor?.name || ""),
      laps: r.laps,
      status: r.status,
      time: getClassifiedRaceTime(r.status, r.Time?.time),
    })),
  }
}

export async function fetchAllStandings() {
  const [drivers, constructors, schedule] = await Promise.all([
    fetchDriverStandings(),
    fetchConstructorStandings(),
    fetchRaceSchedule(),
  ])

  const mappedDrivers = drivers.standings.map((d) => ({
    pos: parseInt(d.position),
    driver: d.Driver.code,
    surname: d.Driver.familyName,
    team: normalizeTeam(d.Constructors[0].name),
    color: getF1TeamColor(normalizeTeam(d.Constructors[0].name)),
    pts: parseInt(d.points),
  }))

  const mappedConstructors = constructors.standings.map((c) => ({
    pos: parseInt(c.position),
    team: normalizeTeam(c.Constructor.name),
    color: getF1TeamColor(normalizeTeam(c.Constructor.name)),
    pts: parseInt(c.points),
  }))

  return {
    drivers: mappedDrivers,
    constructors: mappedConstructors,
    season: drivers.season,
    round: drivers.round,
    totalRaces: schedule.races.length,
    races: schedule.races.map((r) => ({
      round: r.round,
      name: r.raceName,
      circuit: r.Circuit?.circuitName,
      country: r.Circuit?.Location?.country,
      date: r.date,
    })),
  }
}

export function isRaceWeekend(races: { date: string }[]): boolean {
  const now = new Date()
  for (const r of races) {
    const raceDate = new Date(r.date + "T12:00:00Z")
    const friDate = new Date(raceDate.getTime() - 2 * 86400000)
    const sunDate = new Date(raceDate.getTime())
    friDate.setHours(0, 0, 0, 0)
    sunDate.setHours(23, 59, 59, 999)
    if (now >= friDate && now <= sunDate) return true
  }
  return false
}

type Revalidate = number | false

async function fetchJolpica<T>(path: string, cacheSecs: Revalidate = 3600): Promise<T> {
  const url = `${API}/${path}`
  const res = await fetch(url, { next: { revalidate: cacheSecs, tags: [F1_CACHE_TAG] } })
  if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`)
  const j = await res.json()
  return j?.MRData as T
}

interface MRData {
  xmlns: string; series: string; url: string; limit: string; offset: string; total: string
  RaceTable?: { season?: string; round?: string; Races?: Race[] }
  StandingsTable?: { season?: string; round?: string; StandingsLists?: StandingsList[] }
  DriverTable?: { season?: string; Drivers?: DriverInfo[] }
  ConstructorTable?: { season?: string; Constructors?: ConstructorInfo[] }
  SeasonTable?: { Seasons?: { season: string }[] }
}

interface StandingsList {
  season: string; round: string
  DriverStandings?: RawDriverStanding[]
  ConstructorStandings?: RawConstructorStanding[]
}

interface RawDriverStanding {
  position: string; positionText: string; points: string; wins: string
  Driver: { driverId: string; code?: string; givenName: string; familyName: string; dateOfBirth?: string; nationality?: string; permanentNumber?: string }
  Constructors: [{ constructorId: string; name: string }]
}

interface RawConstructorStanding {
  position: string; positionText: string; points: string; wins: string
  Constructor: { constructorId: string; name: string; nationality?: string }
}

interface DriverInfo {
  driverId: string; code?: string; givenName: string; familyName: string; dateOfBirth?: string; nationality?: string; permanentNumber?: string
}

interface ConstructorInfo {
  constructorId: string; name: string; nationality?: string
}

interface RaceResult {
  number: string; position: string; positionText: string; points: string
  Driver: { driverId: string; code?: string; givenName: string; familyName: string }
  Constructor: { constructorId: string; name: string }
  grid: string; laps: string; status: string
  Time?: { millis?: string; time: string }
  FastestLap?: { rank: string; lap: string; Time: { time: string }; AverageSpeed: { units: string; speed: string } }
}

interface QualifyingResult {
  number: string; position: string
  Driver: { driverId: string; code?: string; givenName: string; familyName: string }
  Constructor: { constructorId: string; name: string }
  Q1?: string; Q2?: string; Q3?: string
}

export async function fetchSeasonRaces(year: number) {
  const data = await fetchJolpica<MRData>(`${year}.json`)
  const races = (data.RaceTable?.Races || []) as Race[]
  return {
    season: year,
    races: races.map((r) => ({
      round: parseInt(r.round),
      name: r.raceName,
      circuit: r.Circuit?.circuitName,
      country: r.Circuit?.Location?.country,
      date: r.date,
    })),
  }
}

export async function fetchRaceResults(year: number, round: number) {
  const data = await fetchJolpica<MRData>(`${year}/${round}/results.json`, 300)
  const race = data.RaceTable?.Races?.[0]
  if (!race) return null
  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit?.circuitName,
    country: race.Circuit?.Location?.country,
    date: race.date,
    results: ((race as any).Results || []).map((r: RaceResult) => ({
      position: r.position,
      grid: r.grid,
      driverCode: r.Driver?.code || r.Driver?.driverId,
      driverName: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
      constructorName: normalizeTeam(CONSTRUCTOR_MAP[r.Constructor?.constructorId] || r.Constructor?.name || ""),
      constructorId: r.Constructor?.constructorId,
      laps: r.laps,
      status: r.status,
      time: getClassifiedRaceTime(r.status, r.Time?.time),
      points: r.points,
      fastestLap: r.FastestLap ? { rank: r.FastestLap.rank, time: r.FastestLap.Time.time } : null,
    })),
  }
}

export async function fetchQualifyingResults(year: number, round: number) {
  const data = await fetchJolpica<MRData>(`${year}/${round}/qualifying.json`, 300)
  const race = data.RaceTable?.Races?.[0]
  if (!race) return null
  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    results: ((race as any).QualifyingResults || []).map((q: QualifyingResult) => ({
      position: q.position,
      driverCode: q.Driver?.code || q.Driver?.driverId,
      driverName: `${q.Driver?.givenName} ${q.Driver?.familyName}`,
      constructorName: normalizeTeam(CONSTRUCTOR_MAP[q.Constructor?.constructorId] || q.Constructor?.name),
      q1: q.Q1, q2: q.Q2, q3: q.Q3,
    })),
  }
}

export async function fetchDriverSeasons(driverId: string) {
  const data = await fetchJolpica<MRData>(`drivers/${driverId}/seasons.json`)
  const seasons = (data.SeasonTable?.Seasons || []) as { season: string }[]
  return seasons.map((s) => parseInt(s.season)).filter((y) => y >= 2000).sort((a, b) => b - a)
}

export async function fetchDriverResults(driverId: string, year: number) {
  const data = await fetchJolpica<MRData>(`${year}/drivers/${driverId}/results.json`, 300)
  const races = data.RaceTable?.Races || []
  return {
    season: year,
    driverId,
    races: races.map((r) => {
      const res = r.Results?.[0]
      return {
        round: parseInt(r.round),
        raceName: r.raceName,
        circuit: r.Circuit?.circuitName,
        date: r.date,
        position: res?.positionText || "R",
        grid: res?.grid,
        points: res?.points,
        status: res?.status,
        constructorName: normalizeTeam(CONSTRUCTOR_MAP[res?.Constructor?.constructorId] || res?.Constructor?.name || ""),
      }
    }),
  }
}

export async function fetchDriverStandingsByYear(year: number) {
  const data = await fetchJolpica<MRData>(`${year}/driverStandings.json`, 300)
  const list = data.StandingsTable?.StandingsLists?.[0]
  return {
    season: list?.season,
    round: list?.round,
    standings: (list?.DriverStandings || []).map((d) => ({
      pos: parseInt(d.position),
      driverCode: d.Driver?.code || d.Driver?.driverId,
      driverName: `${d.Driver?.givenName} ${d.Driver?.familyName}`,
      team: normalizeTeam(d.Constructors?.[0]?.name || ""),
      color: getF1TeamColor(normalizeTeam(d.Constructors?.[0]?.name || "")),
      pts: parseInt(d.points),
      wins: parseInt(d.wins),
    })),
  }
}

export async function fetchConstructorStandingsByYear(year: number) {
  const data = await fetchJolpica<MRData>(`${year}/constructorStandings.json`, 300)
  const list = data.StandingsTable?.StandingsLists?.[0]
  return {
    season: list?.season,
    round: list?.round,
    standings: (list?.ConstructorStandings || []).map((c) => ({
      pos: parseInt(c.position),
      team: normalizeTeam(c.Constructor?.name || ""),
      color: getF1TeamColor(normalizeTeam(c.Constructor?.name || "")),
      pts: parseInt(c.points),
      wins: parseInt(c.wins),
    })),
  }
}

export async function fetchConstructorSeasons(constructorId: string) {
  const data = await fetchJolpica<MRData>(`constructors/${constructorId}/seasons.json`)
  const seasons = (data.SeasonTable?.Seasons || []) as { season: string }[]
  return seasons.map((s) => parseInt(s.season)).filter((y) => y >= 2000).sort((a, b) => b - a)
}

export async function fetchConstructorResults(constructorId: string, year: number) {
  const data = await fetchJolpica<MRData>(`${year}/constructors/${constructorId}/results.json`, 300)
  const races = data.RaceTable?.Races || []
  return {
    season: year,
    constructorId,
    races: races.map((r) => {
      const res = (r.Results || []) as RaceResult[]
      return {
        round: parseInt(r.round),
        raceName: r.raceName,
        circuit: r.Circuit?.circuitName,
        date: r.date,
        results: res.map((rr) => ({
          position: rr.position,
          driverCode: rr.Driver?.code || rr.Driver?.driverId,
          driverName: `${rr.Driver?.givenName} ${rr.Driver?.familyName}`,
          points: rr.points,
          status: rr.status,
        })),
      }
    }),
  }
}

export async function fetchAllTimeDriverChampions() {
  const data = await fetchJolpica<MRData>("seasons.json?limit=100")
  const seasons = (data.SeasonTable?.Seasons || []).map((s) => parseInt(s.season)).filter((y) => y >= 2000)
  const results = await Promise.all(
    seasons.map(async (year) => {
      try {
        const d = await fetchJolpica<MRData>(`${year}/driverStandings/1.json`)
        const list = d.StandingsTable?.StandingsLists?.[0]
        const dr = list?.DriverStandings?.[0]
        return {
          season: year,
          driverCode: dr?.Driver?.code || dr?.Driver?.driverId || "",
          driverName: `${dr?.Driver?.givenName || ""} ${dr?.Driver?.familyName || ""}`.trim(),
          team: normalizeTeam(dr?.Constructors?.[0]?.name || ""),
          pts: parseInt(dr?.points || "0"),
          wins: parseInt(dr?.wins || "0"),
        }
      } catch { return null }
    })
  )
  return results.filter(Boolean).reverse()
}

export async function fetchAllTimeConstructorChampions() {
  const data = await fetchJolpica<MRData>("seasons.json?limit=100")
  const seasons = (data.SeasonTable?.Seasons || []).map((s) => parseInt(s.season)).filter((y) => y >= 2000)
  const results = await Promise.all(
    seasons.map(async (year) => {
      try {
        const d = await fetchJolpica<MRData>(`${year}/constructorStandings/1.json`)
        const list = d.StandingsTable?.StandingsLists?.[0]
        const cr = list?.ConstructorStandings?.[0]
        return {
          season: year,
          team: normalizeTeam(cr?.Constructor?.name || ""),
          pts: parseInt(cr?.points || "0"),
          wins: parseInt(cr?.wins || "0"),
        }
      } catch { return null }
    })
  )
  return results.filter(Boolean).reverse()
}
