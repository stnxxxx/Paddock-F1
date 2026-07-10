import { getDrivers, getLaps, getSession, getStints, getPits, getLatestWeather, type OpenF1Lap } from "./openf1"
import { normalizeTeam } from "./normalizer"
import { memoized } from "./cache"

// Aggregated timing for a single session, derived from OpenF1 per-lap data:
// team boards (sectors + trap speeds), a per-driver leaderboard, and tyre stints.

export interface TeamRank {
  team: string
  color: string
  value: number // seconds (sectors) or km/h (speeds)
  delta: number // vs the leader (signed); 0 for the leader
}

export interface DriverStat {
  driver: string
  code: string
  team: string
  color: string
  bestLap: number // seconds, 0 if none
  s1: number
  s2: number
  s3: number
  ideal: number // sum of three best sectors
  topSpeed: number // km/h, max of i1/i2/st
}

export interface StintInfo {
  driver: string
  code: string
  team: string
  color: string
  stints: { compound: string; laps: number; lapStart: number; lapEnd: number }[]
}

export interface PitStop {
  driver: string
  code: string
  team: string
  color: string
  lap: number | null
  duration: number // stationary seconds
}

export interface Weather {
  airTemp?: number
  trackTemp?: number
  humidity?: number
  rainfall?: number
  windSpeed?: number
}

export interface SessionStats {
  sessionKey: number
  sessionName: string | null
  country: string | null
  sectors: { s1: TeamRank[]; s2: TeamRank[]; s3: TeamRank[]; ideal: TeamRank[] }
  speeds: { i1: TeamRank[]; i2: TeamRank[]; st: TeamRank[] }
  drivers: DriverStat[]
  stints: StintInfo[]
  pits: PitStop[]
  weather: Weather | null
}

type Best = { s1: number; s2: number; s3: number; i1: number; i2: number; st: number; color: string }

const better = (a: number, b: number) => (a === 0 ? b : b === 0 ? a : Math.min(a, b))
const faster = (a: number, b: number) => Math.max(a, b)
const r3 = (n: number) => Math.round(n * 1000) / 1000

function rank(teams: Map<string, Best>, pick: (b: Best) => number, lower: boolean, round: number): TeamRank[] {
  const rows = [...teams.entries()]
    .map(([team, b]) => ({ team, color: b.color, value: pick(b) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => (lower ? a.value - b.value : b.value - a.value))
  if (rows.length === 0) return []
  const leader = rows[0].value
  const f = (n: number) => Math.round(n * 10 ** round) / 10 ** round
  return rows.map((r) => ({ team: r.team, color: r.color, value: f(r.value), delta: f(r.value - leader) }))
}

// Finished-session timing data never changes, so cache the whole computed
// result (heavy for races with thousands of laps). Failures aren't cached.
export function computeSessionStats(sessionKey: number): Promise<SessionStats> {
  return memoized(`f1:session-stats:${sessionKey}`, 15 * 60 * 1000, () => buildSessionStats(sessionKey))
}

async function buildSessionStats(sessionKey: number): Promise<SessionStats> {
  // Driver identity is required; everything else degrades gracefully so a slow
  // laps fetch (races can stall on OpenF1) still yields tyres/pits/weather.
  const [session, drivers] = await Promise.all([
    getSession(sessionKey).catch(() => null),
    getDrivers(sessionKey),
  ])
  if (drivers.length === 0) {
    throw new Error("Нет данных сессии") // not cached → retried next view
  }
  const [laps, stintRows, pitRows, weather] = await Promise.all([
    getLaps(sessionKey).catch(() => [] as OpenF1Lap[]),
    getStints(sessionKey).catch(() => []),
    getPits(sessionKey).catch(() => []),
    getLatestWeather(sessionKey).catch(() => undefined),
  ])

  // driver_number → identity
  const info = new Map<number, { name: string; code: string; team: string; color: string }>()
  for (const d of drivers) {
    info.set(d.driver_number, {
      name: d.full_name ?? d.broadcast_name ?? d.name_acronym ?? `#${d.driver_number}`,
      code: d.name_acronym ?? "",
      team: normalizeTeam(d.team_name ?? ""),
      color: d.team_colour ? `#${d.team_colour.replace(/^#/, "")}` : "#888888",
    })
  }

  const blank = (color: string): Best => ({ s1: 0, s2: 0, s3: 0, i1: 0, i2: 0, st: 0, color })
  const accumulate = (cur: Best, lap: OpenF1Lap) => {
    cur.s1 = better(cur.s1, lap.duration_sector_1 ?? 0)
    cur.s2 = better(cur.s2, lap.duration_sector_2 ?? 0)
    cur.s3 = better(cur.s3, lap.duration_sector_3 ?? 0)
    cur.i1 = faster(cur.i1, lap.i1_speed ?? 0)
    cur.i2 = faster(cur.i2, lap.i2_speed ?? 0)
    cur.st = faster(cur.st, lap.st_speed ?? 0)
  }

  // Per-team and per-driver bests from laps.
  const teams = new Map<string, Best>()
  const perDriver = new Map<number, Best>()
  for (const lap of laps) {
    if (lap.is_pit_out_lap) continue
    const id = info.get(lap.driver_number)
    if (!id?.team) continue
    const t = teams.get(id.team) ?? blank(id.color)
    accumulate(t, lap)
    teams.set(id.team, t)
    const d = perDriver.get(lap.driver_number) ?? blank(id.color)
    accumulate(d, lap)
    perDriver.set(lap.driver_number, d)
  }

  // Best lap per driver (separate min over lap_duration).
  const bestLap = new Map<number, number>()
  for (const lap of laps) {
    if (lap.is_pit_out_lap || !lap.lap_duration) continue
    bestLap.set(lap.driver_number, better(bestLap.get(lap.driver_number) ?? 0, lap.lap_duration))
  }

  const idealTeams = new Map<string, Best>()
  for (const [team, b] of teams) {
    if (b.s1 > 0 && b.s2 > 0 && b.s3 > 0) idealTeams.set(team, { ...b, s1: b.s1 + b.s2 + b.s3 })
  }

  // Driver leaderboard, sorted by best lap (drivers without a lap go last).
  const driverStats: DriverStat[] = [...perDriver.entries()]
    .map(([num, b]) => {
      const id = info.get(num)!
      const ideal = b.s1 > 0 && b.s2 > 0 && b.s3 > 0 ? r3(b.s1 + b.s2 + b.s3) : 0
      return {
        driver: id.name,
        code: id.code,
        team: id.team,
        color: id.color,
        bestLap: r3(bestLap.get(num) ?? 0),
        s1: r3(b.s1),
        s2: r3(b.s2),
        s3: r3(b.s3),
        ideal,
        topSpeed: Math.max(b.i1, b.i2, b.st),
      }
    })
    .sort((a, b) => (a.bestLap || 1e9) - (b.bestLap || 1e9))

  // Tyre stints per driver.
  const byDriverStints = new Map<number, StintInfo["stints"]>()
  for (const s of stintRows) {
    if (!s.compound || s.lap_start == null || s.lap_end == null) continue
    const list = byDriverStints.get(s.driver_number) ?? []
    list.push({
      compound: s.compound,
      lapStart: s.lap_start,
      lapEnd: s.lap_end,
      laps: Math.max(0, s.lap_end - s.lap_start + 1),
    })
    byDriverStints.set(s.driver_number, list)
  }
  const stints: StintInfo[] = [...byDriverStints.entries()]
    .map(([num, list]) => {
      const id = info.get(num)!
      return {
        driver: id.name,
        code: id.code,
        team: id.team,
        color: id.color,
        stints: list.sort((a, b) => a.lapStart - b.lapStart),
      }
    })
    .filter((d) => d.driver)
    .sort((a, b) => a.team.localeCompare(b.team))

  // Pit stops, fastest first.
  const pits: PitStop[] = pitRows
    .map((p) => {
      const id = info.get(p.driver_number)
      const duration = p.pit_duration ?? 0
      return id && duration > 0
        ? { driver: id.name, code: id.code, team: id.team, color: id.color, lap: p.lap_number ?? null, duration: r3(duration) }
        : null
    })
    .filter((p): p is PitStop => p !== null)
    .sort((a, b) => a.duration - b.duration)

  return {
    sessionKey,
    sessionName: session?.session_name ?? null,
    country: session?.country_name ?? null,
    sectors: {
      s1: rank(teams, (b) => b.s1, true, 3),
      s2: rank(teams, (b) => b.s2, true, 3),
      s3: rank(teams, (b) => b.s3, true, 3),
      ideal: rank(idealTeams, (b) => b.s1, true, 3),
    },
    speeds: {
      i1: rank(teams, (b) => b.i1, false, 0),
      i2: rank(teams, (b) => b.i2, false, 0),
      st: rank(teams, (b) => b.st, false, 0),
    },
    drivers: driverStats,
    stints,
    pits,
    weather: weather ?? null,
  }
}
