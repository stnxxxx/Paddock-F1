import { type DbQuery } from "@/db"
import { ALL_DRIVERS } from "@/lib/drivers"
import { getF1TeamColor, normalizeTeam, fetchAllStandings } from "@/lib/f1-data"
import { SQUAD, loadFantasyConfig, priceForRank, type FantasyScoring } from "./team-config"
import { recomputePrices } from "./pricing"

export interface FantasyAsset {
  id: string
  season: number
  kind: "driver" | "constructor"
  ref: string
  name: string
  team: string | null
  color: string | null
  price: number
  price_delta: number
  points: number
  form: number
  image: string | null
  image_credit: string | null
  active: number
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

interface SeedDriver { ref: string; name: string; team: string; color: string; pts: number }
interface SeedConstructor { ref: string; name: string; color: string; pts: number }

/** Championship-points lookups for pricing. Prefers `live` standings, else the DB tables. */
async function buildPointsMaps(
  db: DbQuery,
  live: { drivers?: { driver: string; pts: number }[]; constructors?: { team: string; pts: number }[] } | null
): Promise<{ driverPts: Map<string, number>; teamPts: Map<string, number> }> {
  const driverPts = new Map<string, number>()
  const teamPts = new Map<string, number>()
  if (live?.drivers?.length) {
    for (const d of live.drivers) driverPts.set(d.driver, Number(d.pts) || 0)
    for (const c of live.constructors ?? []) teamPts.set(normalizeTeam(c.team), Number(c.pts) || 0)
  } else {
    for (const r of await db.all<{ driver: string; pts: number }>("SELECT driver, pts FROM standings_drivers")) driverPts.set(r.driver, r.pts)
    for (const r of await db.all<{ team: string; pts: number }>("SELECT team, pts FROM standings_constructors")) teamPts.set(normalizeTeam(r.team), r.pts)
  }
  return { driverPts, teamPts }
}

/** Inserts the full active grid (drivers + constructors), priced by championship rank. */
async function seedAssets(db: DbQuery, season: number, driverPts: Map<string, number>, teamPts: Map<string, number>): Promise<void> {
  const { prices } = await loadFantasyConfig(db)

  // Drivers — the full active grid is the authoritative roster.
  const drivers: SeedDriver[] = ALL_DRIVERS.filter((d) => d.active && d.team).map((d) => {
    const team = d.team as string
    return { ref: d.code, name: d.name, team, color: getF1TeamColor(team), pts: driverPts.get(d.code) ?? 0 }
  })

  // Constructors — every distinct team on the active grid.
  const teamOrder: string[] = []
  const teamSeen = new Set<string>()
  for (const d of drivers) {
    const key = normalizeTeam(d.team)
    if (!teamSeen.has(key)) { teamSeen.add(key); teamOrder.push(key) }
  }
  const constructors: SeedConstructor[] = teamOrder.map((team) => ({
    ref: team,
    name: team,
    color: getF1TeamColor(team),
    pts: teamPts.get(team) ?? drivers.filter((d) => normalizeTeam(d.team) === team).reduce((s, d) => s + d.pts, 0),
  }))

  // Order by championship points for pricing (top of the grid = priciest).
  drivers.sort((a, b) => b.pts - a.pts)
  constructors.sort((a, b) => b.pts - a.pts)

  await db.transaction(async (db) => {
    for (let i = 0; i < drivers.length; i++) {
      const price = priceForRank(i, drivers.length, prices.driverMin, prices.driverMax, prices.gamma)
      await db.run(
        "INSERT INTO fantasy_assets (id, season, kind, ref, name, team, color, price, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0) ON CONFLICT (season, kind, ref) DO NOTHING",
        [`${season}:driver:${slug(drivers[i].ref)}`, season, "driver", drivers[i].ref, drivers[i].name, drivers[i].team, drivers[i].color, price]
      )
    }
    for (let i = 0; i < constructors.length; i++) {
      const price = priceForRank(i, constructors.length, prices.constructorMin, prices.constructorMax, prices.gamma)
      await db.run(
        "INSERT INTO fantasy_assets (id, season, kind, ref, name, team, color, price, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0) ON CONFLICT (season, kind, ref) DO NOTHING",
        [`${season}:constructor:${slug(constructors[i].ref)}`, season, "constructor", constructors[i].ref, constructors[i].name, constructors[i].name, constructors[i].color, price]
      )
    }
  })
}

/**
 * Lazily seeds the season's asset catalog, pricing the grid by the **live** championship
 * standings (same Jolpica source as the stats page) so the strongest cars/drivers start
 * priciest. Falls back to the DB standings tables if the network is unavailable.
 * Cheap: a single COUNT short-circuits once seeded.
 */
export async function ensureFantasyAssets(db: DbQuery, season: number): Promise<void> {
  const have = await db.get<{ n: number }>("SELECT COUNT(*) as n FROM fantasy_assets WHERE season = ?", [season])
  if (have && have.n > 0) return
  let live: Awaited<ReturnType<typeof fetchAllStandings>> | null = null
  try { live = await fetchAllStandings() } catch { /* fall back to DB standings */ }
  const { driverPts, teamPts } = await buildPointsMaps(db, live)
  await seedAssets(db, season, driverPts, teamPts)
}

/** Network-free seeding guard (DB standings only) — used where async fetch isn't available. */
export async function ensureFantasyAssetsSync(db: DbQuery, season: number): Promise<void> {
  const have = await db.get<{ n: number }>("SELECT COUNT(*) as n FROM fantasy_assets WHERE season = ?", [season])
  if (have && have.n > 0) return
  const { driverPts, teamPts } = await buildPointsMaps(db, null)
  await seedAssets(db, season, driverPts, teamPts)
}

/** All assets for a season, drivers first then constructors, priciest first. */
export async function getFantasyAssets(db: DbQuery, season: number): Promise<FantasyAsset[]> {
  return db.all<FantasyAsset>(
    "SELECT * FROM fantasy_assets WHERE season = ? AND active = 1 ORDER BY kind DESC, price DESC, name ASC",
    [season]
  )
}

// ── squads & lineups ──────────────────────────────────────────────────────────

export interface SquadRow {
  id: string
  user_id: string
  season: number
  name: string | null
  budget: number
  total_points: number
}

export interface LineupRowFull {
  id: string
  squad_id: string
  round_id: string
  picks: string
  captain: string | null
  chip: string | null
  transfers: number
  penalty: number
  points: number | null
  breakdown: string | null
  locked: number
}

export async function getSquad(db: DbQuery, userId: string, season: number): Promise<SquadRow | undefined> {
  return db.get<SquadRow>(
    "SELECT id, user_id, season, name, budget, total_points FROM fantasy_squads WHERE user_id = ? AND season = ?",
    [userId, season]
  )
}

export async function getLineupForRound(db: DbQuery, squadId: string, roundId: string): Promise<LineupRowFull | undefined> {
  return db.get<LineupRowFull>(
    "SELECT * FROM fantasy_lineups WHERE squad_id = ? AND round_id = ?",
    [squadId, roundId]
  )
}

/** The squad's most recent lineup before `roundNumber` — for transfer counting + carry-forward. */
export async function getLatestLineupBefore(db: DbQuery, squadId: string, roundNumber: number, season: number): Promise<LineupRowFull | undefined> {
  return db.get<LineupRowFull>(`
    SELECT l.* FROM fantasy_lineups l
    JOIN fantasy_rounds r ON r.id = l.round_id
    WHERE l.squad_id = ? AND r.season = ? AND r.round < ?
    ORDER BY r.round DESC LIMIT 1
  `, [squadId, season, roundNumber])
}

// ── scoring engine ────────────────────────────────────────────────────────────

export interface RaceResultRow {
  position: string
  grid: string
  driverCode: string
  constructorName: string
  laps: string
  status: string
  fastestLap: { rank: string } | null
}
export interface QualiResultRow {
  position: string
  driverCode: string
  constructorName: string
}

export interface AssetScore { points: number; breakdown: Record<string, number> }

const isClassified = (status: string): boolean => {
  const s = (status || "").toLowerCase()
  return s === "finished" || s.includes("lap")
}

function pointsFromTable(table: number[], position: number): number {
  return position >= 1 && position <= table.length ? table[position - 1] : 0
}

/**
 * Scores every driver and constructor for a single round from race + qualifying
 * results, using the (admin-tunable) scoring config. Drivers are keyed by code,
 * constructors by normalized team name.
 */
export function scoreAssetsForRound(
  scoring: FantasyScoring,
  raceRows: RaceResultRow[],
  qualiRows: QualiResultRow[]
): { drivers: Record<string, AssetScore>; constructors: Record<string, AssetScore> } {
  const qualiByCode = new Map<string, number>()
  const qualiTeam = new Map<string, string>()
  for (const q of qualiRows) {
    qualiByCode.set(q.driverCode, parseInt(q.position))
    qualiTeam.set(q.driverCode, q.constructorName)
  }
  const raceByCode = new Map<string, RaceResultRow>()
  for (const r of raceRows) raceByCode.set(r.driverCode, r)

  // Team-mate lookup per constructor (for "beat your team-mate" bonuses).
  const teamDrivers = new Map<string, string[]>()
  for (const r of raceRows) {
    const arr = teamDrivers.get(r.constructorName) || []
    arr.push(r.driverCode)
    teamDrivers.set(r.constructorName, arr)
  }
  const teammateOf = (code: string, team: string): string | null =>
    (teamDrivers.get(team) || []).find((c) => c !== code) ?? null

  const drivers: Record<string, AssetScore> = {}

  for (const r of raceRows) {
    const code = r.driverCode
    const team = r.constructorName
    const bd: Record<string, number> = {}

    // Qualifying.
    const qPos = qualiByCode.get(code)
    if (qPos && qPos > 0) {
      const qp = pointsFromTable(scoring.qualiPoints, qPos)
      if (qp) bd.quali = qp
      const mate = teammateOf(code, qualiTeam.get(code) || team)
      const matePos = mate ? qualiByCode.get(mate) : undefined
      if (matePos && qPos < matePos) bd.beatTeammateQuali = scoring.beatTeammateQuali
    }

    // Race finish.
    const rPos = parseInt(r.position)
    const classified = isClassified(r.status)
    if (classified) {
      const rp = pointsFromTable(scoring.racePoints, rPos)
      if (rp) bd.race = rp
      if (scoring.finishBonus) bd.finish = scoring.finishBonus
    } else if (scoring.dnf) {
      bd.dnf = scoring.dnf
    }

    // Positions gained / lost (grid → finish). Pit-lane start (grid 0) counts from the back.
    if (classified) {
      const gridPos = parseInt(r.grid) || raceRows.length
      const delta = (gridPos === 0 ? raceRows.length : gridPos) - rPos
      const swing = Math.max(-scoring.maxPosSwing, Math.min(scoring.maxPosSwing, delta))
      const movePts = swing >= 0 ? swing * scoring.posGained : swing * Math.abs(scoring.posLost)
      if (movePts) bd.movement = movePts
    }

    // Fastest lap.
    if (r.fastestLap?.rank === "1" && scoring.fastestLap) bd.fastestLap = scoring.fastestLap

    // Beat team-mate in the race (both compared on finishing position).
    const mate = teammateOf(code, team)
    if (mate) {
      const mr = raceByCode.get(mate)
      if (mr && parseInt(r.position) < parseInt(mr.position)) bd.beatTeammateRace = scoring.beatTeammateRace
    }

    const points = Object.values(bd).reduce((a, b) => a + b, 0)
    drivers[code] = { points, breakdown: bd }
  }

  // Constructors = sum of their drivers + both-classified bonus + fastest-lap bonus.
  const constructors: Record<string, AssetScore> = {}
  for (const [team, codes] of teamDrivers) {
    const bd: Record<string, number> = {}
    let sum = 0
    for (const code of codes) sum += drivers[code]?.points ?? 0
    if (sum) bd.drivers = sum
    const allClassified = codes.every((c) => isClassified(raceByCode.get(c)?.status || ""))
    if (allClassified && codes.length >= 2 && scoring.bothFinishBonus) bd.bothFinish = scoring.bothFinishBonus
    const teamFastest = codes.some((c) => raceByCode.get(c)?.fastestLap?.rank === "1")
    if (teamFastest && scoring.constructorFastestLap) bd.fastestLap = scoring.constructorFastestLap
    const points = Object.values(bd).reduce((a, b) => a + b, 0)
    constructors[normalizeTeam(team)] = { points, breakdown: bd }
  }

  return { drivers, constructors }
}

// ── round resolution (team mode) ──────────────────────────────────────────────

interface LineupRow {
  id: string
  squad_id: string
  picks: string
  captain: string | null
  transfers: number
}

/**
 * Resolves the team-mode side of a round: writes per-asset scores, bumps season
 * totals/form, then scores every squad's locked lineup (captain ×2, transfer
 * penalty) and updates squad totals. Idempotent per round via a resolved guard.
 */
export async function resolveFantasyTeamRound(
  db: DbQuery,
  season: number,
  roundId: string,
  raceRows: RaceResultRow[],
  qualiRows: QualiResultRow[]
): Promise<void> {
  await ensureFantasyAssetsSync(db, season)
  const { scoring } = await loadFantasyConfig(db)
  const { drivers, constructors } = scoreAssetsForRound(scoring, raceRows, qualiRows)

  const assets = await db.all<{ id: string; kind: "driver" | "constructor"; ref: string }>(
    "SELECT id, kind, ref FROM fantasy_assets WHERE season = ?", [season]
  )

  // Map an asset to its computed score this round.
  const scoreFor = (a: { kind: string; ref: string }): AssetScore =>
    (a.kind === "driver" ? drivers[a.ref] : constructors[normalizeTeam(a.ref)]) ?? { points: 0, breakdown: {} }

  const lineups = await db.all<LineupRow>(
    "SELECT id, squad_id, picks, captain, transfers FROM fantasy_lineups WHERE round_id = ?", [roundId]
  )

  // Whether an asset actually featured in this round's results (vs. didn't race).
  const participated = (a: { kind: string; ref: string }): boolean =>
    a.kind === "driver" ? a.ref in drivers : normalizeTeam(a.ref) in constructors

  await db.transaction(async (db) => {
    const pointsById = new Map<string, AssetScore>()
    for (const a of assets) {
      const s = scoreFor(a)
      pointsById.set(a.id, s)
      if (participated(a)) {
        await db.run(
          "INSERT INTO fantasy_asset_scores (asset_id, round_id, points, breakdown) VALUES (?, ?, ?, ?) ON CONFLICT (asset_id, round_id) DO UPDATE SET points = EXCLUDED.points, breakdown = EXCLUDED.breakdown",
          [a.id, roundId, s.points, JSON.stringify(s.breakdown)]
        )
        await db.run("UPDATE fantasy_assets SET points = points + ?, form = ? WHERE id = ?", [s.points, s.points, a.id])
      }
    }

    for (const lu of lineups) {
      let picks: { drivers?: string[]; constructors?: string[] } = {}
      try { picks = JSON.parse(lu.picks) } catch { /* skip malformed */ }
      const ids = [...(picks.drivers || []), ...(picks.constructors || [])]
      const breakdown: Record<string, number> = {}
      let total = 0
      for (const id of ids) {
        const s = pointsById.get(id) ?? { points: 0, breakdown: {} }
        const mult = id === lu.captain ? SQUAD.captainMultiplier : 1
        breakdown[id] = s.points * mult
        total += s.points * mult
      }
      const penalty = Math.max(0, lu.transfers - SQUAD.freeTransfers) * SQUAD.transferPenalty
      if (penalty) breakdown.__penalty = -penalty
      total -= penalty
      await db.run("UPDATE fantasy_lineups SET points = ?, breakdown = ?, locked = 1, updated_at = NOW() WHERE id = ?", [total, JSON.stringify(breakdown), lu.id])
      await db.run(
        "UPDATE fantasy_squads SET total_points = (SELECT COALESCE(SUM(points),0) FROM fantasy_lineups WHERE squad_id = ?) WHERE id = ?",
        [lu.squad_id, lu.squad_id]
      )
    }
  })

  // Move market prices from the freshly written scores + ownership trend.
  await recomputePrices(db, season, roundId)
}