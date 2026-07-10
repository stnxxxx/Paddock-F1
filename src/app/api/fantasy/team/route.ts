import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { ensureFantasyRounds } from "@/lib/fantasy"
import {
  ensureFantasyAssets, getFantasyAssets, getSquad, getLineupForRound, getLatestLineupBefore,
  type FantasyAsset,
} from "@/lib/fantasy/team"
import { SQUAD } from "@/lib/fantasy/team-config"
import { v4 as uuid } from "uuid"

interface RoundRow {
  id: string; season: number; round: number; name: string
  circuit: string | null; country: string | null; deadline: string; status: string
}

const RULES = {
  budget: SQUAD.budget,
  drivers: SQUAD.drivers,
  constructors: SQUAD.constructors,
  captainMultiplier: SQUAD.captainMultiplier,
  freeTransfers: SQUAD.freeTransfers,
  transferPenalty: SQUAD.transferPenalty,
}

function parsePicks(raw: string): { drivers: string[]; constructors: string[] } {
  try {
    const p = JSON.parse(raw)
    return { drivers: Array.isArray(p.drivers) ? p.drivers : [], constructors: Array.isArray(p.constructors) ? p.constructors : [] }
  } catch {
    return { drivers: [], constructors: [] }
  }
}

export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()
  try { await ensureFantasyRounds(db) } catch { /* keep serving cached state */ }

  const current = await db.get("SELECT * FROM fantasy_rounds WHERE status = 'open' ORDER BY round ASC LIMIT 1") as RoundRow | undefined
  const season = current?.season ?? new Date().getUTCFullYear()
  await ensureFantasyAssets(db, season)
  const assets = await getFantasyAssets(db, season)
  const now = Date.now()

  const round = current
    ? {
        id: current.id, round: current.round, name: current.name, circuit: current.circuit,
        country: current.country, deadline: current.deadline, locked: Date.parse(current.deadline) <= now,
      }
    : null

  let squad: { id: string; name: string | null; budget: number; totalPoints: number } | null = null
  let lineup: ReturnType<typeof projectLineup> | null = null
  let carryPicks: { drivers: string[]; constructors: string[]; captain: string | null } | null = null

  if (auth) {
    const s = await getSquad(db, auth.userId, season)
    if (s) {
      squad = { id: s.id, name: s.name, budget: s.budget, totalPoints: s.total_points }
      if (current) {
        const lu = await getLineupForRound(db, s.id, current.id)
        if (lu) {
          lineup = projectLineup(lu.picks, lu.captain, lu.transfers, lu.penalty, lu.points, lu.breakdown, lu.locked)
        } else {
          const prev = await getLatestLineupBefore(db, s.id, current.round, season)
          if (prev) {
            const p = parsePicks(prev.picks)
            carryPicks = { drivers: p.drivers, constructors: p.constructors, captain: prev.captain }
          }
        }
      }
    }
  }

  const leaderboard = await db.all(`
    SELECT sq.id, sq.name, sq.total_points as points, u.username, u.display_name, u.team
    FROM fantasy_squads sq JOIN users u ON u.id = sq.user_id
    WHERE sq.season = ? AND sq.total_points != 0
    ORDER BY sq.total_points DESC, sq.created_at ASC LIMIT 20
  `, [season])

  return apiResponse({ season, round, rules: RULES, assets, squad, lineup, carryPicks, leaderboard })
}

function projectLineup(
  picksRaw: string, captain: string | null, transfers: number, penalty: number,
  points: number | null, breakdownRaw: string | null, locked: number
) {
  const picks = parsePicks(picksRaw)
  let breakdown: Record<string, number> | null = null
  try { breakdown = breakdownRaw ? JSON.parse(breakdownRaw) : null } catch { breakdown = null }
  return { drivers: picks.drivers, constructors: picks.constructors, captain, transfers, penalty, points, breakdown, locked: !!locked }
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "fantasy-team", 60, 10 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => null) as {
    drivers?: unknown; constructors?: unknown; captain?: unknown; name?: unknown
  } | null
  if (!body) return apiError("Некорректный запрос")

  const db = getDb()
  try { await ensureFantasyRounds(db) } catch { /* ignore */ }
  const current = await db.get("SELECT * FROM fantasy_rounds WHERE status = 'open' ORDER BY round ASC LIMIT 1") as RoundRow | undefined
  if (!current) return apiError("Нет открытого этапа для состава", 409)
  if (Date.parse(current.deadline) <= Date.now()) return apiError("Дедлайн прошёл — состав на этот этап закрыт", 409)

  const season = current.season
  await ensureFantasyAssets(db, season)
  const assets = await getFantasyAssets(db, season)
  const byId = new Map<string, FantasyAsset>(assets.map((a) => [a.id, a]))

  const drivers = Array.isArray(body.drivers) ? body.drivers.filter((x): x is string => typeof x === "string") : []
  const constructors = Array.isArray(body.constructors) ? body.constructors.filter((x): x is string => typeof x === "string") : []
  const captain = typeof body.captain === "string" ? body.captain : null

  // Composition + validity.
  const uniqD = new Set(drivers), uniqC = new Set(constructors)
  if (uniqD.size !== SQUAD.drivers || uniqC.size !== SQUAD.constructors) {
    return apiError(`Нужно ровно ${SQUAD.drivers} пилотов и ${SQUAD.constructors} конструктора`)
  }
  for (const id of drivers) { const a = byId.get(id); if (!a || a.kind !== "driver") return apiError("Неизвестный пилот в составе") }
  for (const id of constructors) { const a = byId.get(id); if (!a || a.kind !== "constructor") return apiError("Неизвестный конструктор в составе") }
  const allIds = [...drivers, ...constructors]
  if (!captain || !drivers.includes(captain)) return apiError("Капитан должен быть из числа пилотов")

  // Budget.
  const cost = allIds.reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0)
  if (cost > SQUAD.budget + 1e-6) return apiError(`Превышен бюджет: ${cost.toFixed(1)} из ${SQUAD.budget} $M`)

  // Squad (create on first save).
  let s = await getSquad(db, auth.userId, season)
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 40) : null
  if (!s) {
    const id = uuid()
    await db.run("INSERT INTO fantasy_squads (id, user_id, season, name, budget, total_points) VALUES (?, ?, ?, ?, ?, 0)",
      [id, auth.userId, season, name, SQUAD.budget - cost])
    s = (await getSquad(db, auth.userId, season))!
  } else {
    await db.run("UPDATE fantasy_squads SET budget = ?, name = COALESCE(?, name) WHERE id = ?", [SQUAD.budget - cost, name, s.id])
  }

  // Transfers vs the previous round's lineup (re-saving this round always diffs the prior round).
  const prev = await getLatestLineupBefore(db, s.id, current.round, season)
  let transfers = 0
  if (prev) {
    const p = parsePicks(prev.picks)
    const prevIds = new Set([...p.drivers, ...p.constructors])
    transfers = allIds.filter((id) => !prevIds.has(id)).length
  }
  const penalty = Math.max(0, transfers - SQUAD.freeTransfers) * SQUAD.transferPenalty

  const picksJson = JSON.stringify({ drivers, constructors })
  await db.run(`
    INSERT INTO fantasy_lineups (id, squad_id, round_id, picks, captain, transfers, penalty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(squad_id, round_id) DO UPDATE SET
      picks = EXCLUDED.picks, captain = EXCLUDED.captain, transfers = EXCLUDED.transfers,
      penalty = EXCLUDED.penalty, updated_at = NOW()
  `, [uuid(), s.id, current.id, picksJson, captain, transfers, penalty])

  return apiResponse({
    ok: true,
    squad: { id: s.id, name: name ?? s.name, budget: SQUAD.budget - cost, totalPoints: s.total_points },
    lineup: { drivers, constructors, captain, transfers, penalty, cost },
  })
}