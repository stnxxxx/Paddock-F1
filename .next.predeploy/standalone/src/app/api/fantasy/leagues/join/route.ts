import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { rateLimitGuard } from "@/lib/rate-limit"

interface LeagueRow { id: string; season: number; name: string; code: string; owner_id: string }

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "fantasy-league-join", 30, 60 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => null) as { code?: unknown } | null
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : ""
  if (!code) return apiError("Введите код лиги")

  const db = getDb()
  const league = await db.get("SELECT id, season, name, code, owner_id FROM fantasy_leagues WHERE code = ?", [code]) as LeagueRow | undefined
  if (!league) return apiError("Лига с таким кодом не найдена", 404)

  const already = await db.get("SELECT 1 FROM fantasy_league_members WHERE league_id = ? AND user_id = ?", [league.id, auth.userId])
  if (already) return apiError("Вы уже в этой лиге", 409)

  await db.run("INSERT INTO fantasy_league_members (league_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [league.id, auth.userId])

  const members = (await db.get("SELECT COUNT(*) as c FROM fantasy_league_members WHERE league_id = ?", [league.id]) as { c: number }).c
  return apiResponse({ ok: true, league: { id: league.id, name: league.name, code: league.code, members, isOwner: league.owner_id === auth.userId } }, 201)
}