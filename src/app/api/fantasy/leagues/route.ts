import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"
import { v4 as uuid } from "uuid"

interface LeagueRow { id: string; season: number; name: string; code: string; owner_id: string }

async function currentSeason(db: ReturnType<typeof getDb>): Promise<number> {
  const r = await db.get("SELECT season FROM fantasy_rounds ORDER BY season DESC, round DESC LIMIT 1") as { season: number } | undefined
  return r?.season ?? new Date().getUTCFullYear()
}

// Unambiguous code alphabet (no 0/O/1/I).
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let s = ""
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function standingsFor(db: ReturnType<typeof getDb>, leagueId: string, season: number) {
  return db.all(`
    SELECT u.username, u.display_name, u.team, COALESCE(sq.total_points, 0) as points, sq.name as squad_name
    FROM fantasy_league_members m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN fantasy_squads sq ON sq.user_id = m.user_id AND sq.season = ?
    WHERE m.league_id = ?
    ORDER BY points DESC, u.username ASC
  `, [season, leagueId])
}

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const db = getDb()
  const season = await currentSeason(db)

  const leagues = await db.all(`
    SELECT lg.id, lg.name, lg.code, lg.owner_id, lg.season,
      (SELECT COUNT(*) FROM fantasy_league_members WHERE league_id = lg.id) as members
    FROM fantasy_leagues lg
    JOIN fantasy_league_members m ON m.league_id = lg.id
    WHERE m.user_id = ?
    ORDER BY lg.created_at DESC
  `, [auth.userId]) as (LeagueRow & { members: number })[]

  return apiResponse({
    leagues: leagues.map((lg) => ({
      id: lg.id, name: lg.name, code: lg.code, members: lg.members,
      isOwner: lg.owner_id === auth.userId,
      standings: standingsFor(db, lg.id, lg.season ?? season),
    })),
  })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "fantasy-league-create", 10, 60 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => null) as { name?: unknown } | null
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : ""
  if (!name) return apiError("Введите название лиги")

  const db = getDb()
  const season = await currentSeason(db)
  const id = uuid()

  // Generate a unique code (retry on the rare collision).
  let code = genCode()
  for (let i = 0; i < 5; i++) {
    const taken = await db.get("SELECT 1 FROM fantasy_leagues WHERE code = ?", [code])
    if (!taken) break
    code = genCode()
  }

  await db.transaction(async (db) => {
    await db.run("INSERT INTO fantasy_leagues (id, season, name, code, owner_id) VALUES (?, ?, ?, ?, ?)", [id, season, name, code, auth.userId])
    await db.run("INSERT INTO fantasy_league_members (league_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [id, auth.userId])
  })

  return apiResponse({ ok: true, league: { id, name, code, members: 1, isOwner: true, standings: standingsFor(db, id, season) } }, 201)
}

export async function DELETE(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return apiError("Укажите id лиги")

  const db = getDb()
  const league = await db.get("SELECT id, owner_id FROM fantasy_leagues WHERE id = ?", [id]) as LeagueRow | undefined
  if (!league) return apiError("Лига не найдена", 404)
  if (league.owner_id !== auth.userId) return apiError("Только создатель может удалить лигу", 403)

  await db.transaction(async (db) => {
    await db.run("DELETE FROM fantasy_league_members WHERE league_id = ?", [id])
    await db.run("DELETE FROM fantasy_leagues WHERE id = ?", [id])
  })

  return apiResponse({ ok: true })
}