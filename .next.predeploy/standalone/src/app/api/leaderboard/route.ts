import { getDb } from "@/db"
import { apiResponse, getAuthUser } from "@/lib/auth"

type Row = { id: string; username: string; team: string | null; points: number; meta?: string | number }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get("scope") || "season"
  const auth = await getAuthUser()
  const db = getDb()

  const latest = await db.get("SELECT season, round, name FROM fantasy_rounds WHERE status = 'resolved' ORDER BY season DESC, round DESC LIMIT 1") as { season: number; round: number; name: string } | undefined
  const season = latest?.season

  let rows: Row[] = []
  let meta: Record<string, unknown> = { scope }

  if (scope === "karma") {
    rows = await db.all(`
      SELECT u.id, u.username, u.team, u.karma as points, u.karma as meta
      FROM users u WHERE u.banned = 0 AND u.hide_leaderboard = 0
      ORDER BY u.karma DESC, u.username ASC
    `) as Row[]
  } else if (scope === "round" && latest) {
    const roundId = await db.get("SELECT id FROM fantasy_rounds WHERE season = ? AND round = ?", [latest.season, latest.round]) as { id: string } | undefined
    rows = roundId ? await db.all(`
      SELECT u.id, u.username, u.team, fe.points as points
      FROM fantasy_entries fe JOIN users u ON u.id = fe.user_id
      WHERE fe.round_id = ? AND u.banned = 0 AND u.hide_leaderboard = 0
      ORDER BY fe.points DESC, u.username ASC
    `, [roundId.id]) as Row[] : []
    meta = { scope, roundName: latest.name, round: latest.round }
  } else {
    // season (default)
    rows = season ? await db.all(`
      SELECT u.id, u.username, u.team, COALESCE(SUM(fe.points),0) as points, COUNT(fe.id) as meta
      FROM fantasy_entries fe
      JOIN fantasy_rounds fr ON fr.id = fe.round_id AND fr.status = 'resolved' AND fr.season = ?
      JOIN users u ON u.id = fe.user_id
      WHERE u.banned = 0 AND u.hide_leaderboard = 0
      GROUP BY u.id
      HAVING points > 0 OR COUNT(fe.id) > 0
      ORDER BY points DESC, u.username ASC
    `, [season]) as Row[] : []
    meta = { scope, season }
  }

  const myIndex = auth ? rows.findIndex((r) => r.id === auth.userId) : -1
  const me = myIndex >= 0 ? { rank: myIndex + 1, points: rows[myIndex].points } : null

  return apiResponse({ users: rows.slice(0, 50), total: rows.length, me, meta })
}