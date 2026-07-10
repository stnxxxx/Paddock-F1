import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse, apiBanGuard } from "@/lib/auth"
import { ensureFantasyRounds, getFantasyDrivers, QUESTIONS, type QKey } from "@/lib/fantasy"
import { rateLimitGuard } from "@/lib/rate-limit"
import { v4 as uuid } from "uuid"

interface RoundRow {
  id: string; season: number; round: number; name: string; circuit: string | null
  country: string | null; deadline: string; questions: string; status: string; resolved_at: string | null
}

function parseQuestions(raw: string): QKey[] {
  try { const q = JSON.parse(raw); return Array.isArray(q) ? q.filter((k: string): k is QKey => k in QUESTIONS) : [] } catch { return [] }
}

export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()
  try { await ensureFantasyRounds(db) } catch { /* keep serving cached state */ }

  const drivers = await getFantasyDrivers(db)

  const now = Date.now()
  const current = await db.get("SELECT * FROM fantasy_rounds WHERE status = 'open' ORDER BY round ASC LIMIT 1") as RoundRow | undefined
  let currentOut = null
  if (current) {
    const myAnswers = auth
      ? (await db.get<{ answers: string }>("SELECT answers FROM fantasy_entries WHERE round_id = ? AND user_id = ?", [current.id, auth.userId]))
      : undefined
    const entryCount = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM fantasy_entries WHERE round_id = ?", [current.id]))!.c
    currentOut = {
      id: current.id, season: current.season, round: current.round, name: current.name,
      circuit: current.circuit, country: current.country, deadline: current.deadline,
      questions: parseQuestions(current.questions),
      locked: Date.parse(current.deadline) <= now,
      myAnswers: myAnswers ? JSON.parse(myAnswers.answers) : null,
      entryCount,
    }
  }

  const resolvedRows = await db.all("SELECT * FROM fantasy_rounds WHERE status = 'resolved' ORDER BY round DESC LIMIT 5") as RoundRow[]
  const recent = []
  for (const r of resolvedRows) {
    const mine = auth
      ? (await db.get<{ points: number; breakdown: string | null }>(
          "SELECT points, breakdown FROM fantasy_entries WHERE round_id = ? AND user_id = ?", [r.id!, auth.userId]
        )) ?? null
      : null
    const agg = await db.get<{ c: number; top: number }>(
      "SELECT COUNT(*) as c, COALESCE(MAX(points),0) as top FROM fantasy_entries WHERE round_id = ?", [r.id!]
    )
    recent.push({
      id: r.id, round: r.round, name: r.name, circuit: r.circuit,
      questions: parseQuestions(r.questions),
      myPoints: mine?.points ?? null,
      myBreakdown: mine?.breakdown ? JSON.parse(mine.breakdown) : null,
      entryCount: agg!.c, topScore: agg!.top,
    })
  }

  return apiResponse({ current: currentOut, recent, drivers })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned
  const limited = rateLimitGuard(req, "fantasy-predict", 60, 10 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => null) as { roundId?: string; answers?: Record<string, unknown> } | null
  if (!body?.roundId || !body.answers) return apiError("Некорректный запрос")

  const db = getDb()
  const round = await db.get<RoundRow>("SELECT id, deadline, questions, status FROM fantasy_rounds WHERE id = ?", [body.roundId])
  if (!round) return apiError("Раунд не найден", 404)
  if (round.status !== "open" || Date.parse(round.deadline) <= Date.now()) return apiError("Приём прогнозов на этот этап закрыт", 409)

  const questions = parseQuestions(round.questions)
  const validCodes = new Set((await getFantasyDrivers(db)).map((d) => d.code))

  // Keep only valid answers for this round's questions.
  const clean: Record<string, unknown> = {}
  for (const q of questions) {
    const a = body.answers[q]
    if (q === "podium") {
      const arr = Array.isArray(a) ? a.filter((c): c is string => typeof c === "string" && validCodes.has(c)) : []
      if (arr.length) clean[q] = arr.slice(0, 3)
    } else if (typeof a === "string" && validCodes.has(a)) {
      clean[q] = a
    }
  }
  if (Object.keys(clean).length === 0) return apiError("Заполните хотя бы один прогноз")

  const existing = await db.get<{ id: string }>("SELECT id FROM fantasy_entries WHERE round_id = ? AND user_id = ?", [round.id, auth.userId])
  if (existing) {
    await db.run("UPDATE fantasy_entries SET answers = ?, updated_at = NOW() WHERE id = ?", [JSON.stringify(clean), existing.id])
  } else {
    await db.run("INSERT INTO fantasy_entries (id, round_id, user_id, answers) VALUES (?, ?, ?, ?)", [uuid(), round.id, auth.userId, JSON.stringify(clean)])
  }

  return apiResponse({ ok: true, answers: clean })
}