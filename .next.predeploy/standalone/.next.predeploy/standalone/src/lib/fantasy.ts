import { type DbQuery } from "@/db"
import { v4 as uuid } from "uuid"
import { fetchRaceSchedule, fetchRaceResults, fetchQualifyingResults, fetchAllStandings } from "@/lib/f1-data"
import { resolveFantasyTeamRound, type RaceResultRow, type QualiResultRow } from "@/lib/fantasy/team"

export interface FantasyDriver { code: string; surname: string; name: string; team: string; color: string; image: string | null }

/** Full current grid for the prediction pickers — from Jolpica, falling back to the seeded standings. */
export async function getFantasyDrivers(db: DbQuery): Promise<FantasyDriver[]> {
  const assets = await db.all<{ ref: string; name: string; image: string | null }>(
    "SELECT ref, name, image FROM fantasy_assets WHERE season = (SELECT MAX(season) FROM fantasy_assets) AND kind = 'driver' AND active = 1"
  )
  const byRef = new Map(assets.map((a) => [a.ref, a]))
  try {
    const s = await fetchAllStandings()
    if (s.drivers?.length) return s.drivers.map((d) => ({
      code: d.driver, surname: d.surname || d.driver, name: byRef.get(d.driver)?.name ?? d.surname ?? d.driver,
      team: d.team, color: d.color, image: byRef.get(d.driver)?.image ?? null,
    }))
  } catch { /* fall back */ }
  return (await db.all<{ code: string; surname: string; team: string; color: string }>(
    "SELECT driver as code, driver as surname, team, color FROM standings_drivers ORDER BY pos"
  )).map((d) => ({ ...d, name: byRef.get(d.code)?.name ?? d.surname, image: byRef.get(d.code)?.image ?? null }))
}

// ── question pool ────────────────────────────────────────────────────────────

export type QKey = "winner" | "podium" | "pole" | "fastest_lap" | "dnf"

export const QUESTIONS: Record<QKey, { label: string; short: string; weight: number; kind: "driver" | "podium" }> = {
  winner: { label: "Победитель гонки", short: "Победитель", weight: 25, kind: "driver" },
  podium: { label: "Подиум (топ-3)", short: "Подиум", weight: 30, kind: "podium" },
  pole: { label: "Поул-позиция", short: "Поул", weight: 15, kind: "driver" },
  fastest_lap: { label: "Быстрый круг", short: "Быстрый круг", weight: 10, kind: "driver" },
  dnf: { label: "Первый сход", short: "Первый сход", weight: 15, kind: "driver" },
}
const PODIUM_EXACT_BONUS = 15

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic per-round set of 3–4 questions (so each GP feels fresh but stays stable). */
export function pickQuestions(round: number): QKey[] {
  const keys = Object.keys(QUESTIONS) as QKey[]
  const rng = mulberry32((round * 2654435761) % 2147483647 + 17)
  const arr = [...keys]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const count = 3 + Math.floor(rng() * 2)
  return arr.slice(0, count)
}

// ── scoring ──────────────────────────────────────────────────────────────────

interface RaceRow { position: string; driverCode: string; status?: string; laps?: string; fastestLap?: { rank: string } | null }

function firstDnf(rows: RaceRow[]): string | null {
  const retired = rows.filter((r) => {
    const s = (r.status || "").toLowerCase()
    return s !== "finished" && !s.includes("lap")
  })
  if (retired.length === 0) return null
  // earliest retirement ≈ fewest completed laps
  retired.sort((a, b) => parseInt(a.laps || "0") - parseInt(b.laps || "0"))
  return retired[0].driverCode
}

export interface ScoreResult {
  points: number
  breakdown: Record<string, { points: number; answer: unknown; correct: unknown }>
}

export function scoreRound(
  answers: Record<string, unknown>,
  questions: QKey[],
  raceRows: RaceRow[],
  qualiPole: string | null
): ScoreResult {
  const ordered = [...raceRows].sort((a, b) => parseInt(a.position) - parseInt(b.position))
  const winner = ordered.find((r) => r.position === "1")?.driverCode ?? null
  const podium = ordered.slice(0, 3).map((r) => r.driverCode)
  const fastest = ordered.find((r) => r.fastestLap?.rank === "1")?.driverCode ?? null
  const dnf = firstDnf(raceRows)

  const breakdown: ScoreResult["breakdown"] = {}
  let points = 0

  for (const q of questions) {
    const answer = answers[q]
    let p = 0
    let correct: unknown = null
    if (q === "winner") { correct = winner; if (winner && answer === winner) p = 25 }
    else if (q === "pole") { correct = qualiPole; if (qualiPole && answer === qualiPole) p = 15 }
    else if (q === "fastest_lap") { correct = fastest; if (fastest && answer === fastest) p = 10 }
    else if (q === "dnf") { correct = dnf; if (dnf && answer === dnf) p = 15 }
    else if (q === "podium") {
      correct = podium
      const pred = Array.isArray(answer) ? (answer as string[]) : []
      for (const code of pred) if (podium.includes(code)) p += 10
      if (pred.length === 3 && pred.every((c, i) => c === podium[i])) p += PODIUM_EXACT_BONUS
    }
    breakdown[q] = { points: p, answer: answer ?? null, correct }
    points += p
  }

  return { points, breakdown }
}

// ── round lifecycle (lazy, no cron) ──────────────────────────────────────────

interface RoundRow {
  id: string; season: number; round: number; name: string; circuit: string | null
  country: string | null; deadline: string; questions: string; status: string
}

/**
 * Ensures a fantasy round exists for the next Grand Prix and auto-resolves any past
 * round whose results are available. Cheap: it only fetches results for rounds that are
 * locked-but-unresolved (usually zero or one).
 */
export async function ensureFantasyRounds(db: DbQuery): Promise<void> {
  interface SchedRace { round: string; raceName: string; date: string; time?: string; Circuit?: { circuitName?: string; Location?: { country?: string } }; Qualifying?: { date: string; time?: string }; Sprint?: { date: string; time?: string } }
  let schedule: { season?: string; races?: SchedRace[] }
  try {
    schedule = await fetchRaceSchedule() as unknown as { season?: string; races?: SchedRace[] }
  } catch {
    return
  }
  const season = parseInt(schedule.season || `${new Date().getUTCFullYear()}`)
  if (!Number.isFinite(season) || !schedule.races?.length) return
  const now = Date.now()
  // Predictions lock at the start of qualifying (pole is known after quali). Fall back to
  // 24h before the race when the schedule doesn't carry session times.
  const deadlineOf = (r: SchedRace) => {
    const q = r.Sprint && r.Qualifying ? (Date.parse(`${r.Sprint.date}T${r.Sprint.time || "12:00:00Z"}`) < Date.parse(`${r.Qualifying.date}T${r.Qualifying.time || "12:00:00Z"}`) ? r.Sprint : r.Qualifying) : r.Qualifying
    if (q?.date) return Date.parse(`${q.date}T${q.time || "12:00:00Z"}`)
    return Date.parse(`${r.date}T${r.time || "13:00:00Z"}`) - 24 * 3600000
  }

  // 1. Create (or refresh the deadline of) the round for the next upcoming GP.
  const next = [...schedule.races].sort((a, b) => parseInt(a.round) - parseInt(b.round)).find((r) => deadlineOf(r) > now)
  if (next) {
    const round = parseInt(next.round)
    const deadline = new Date(deadlineOf(next)).toISOString()
    const exists = await db.get<{ id: string; status: string }>(
      "SELECT id, status FROM fantasy_rounds WHERE season = ? AND round = ?", [season, round]
    )
    if (!exists) {
      await db.run(
        "INSERT INTO fantasy_rounds (id, season, round, name, circuit, country, deadline, questions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')",
        [uuid(), season, round, next.raceName, next.Circuit?.circuitName ?? null, next.Circuit?.Location?.country ?? null, deadline, JSON.stringify(pickQuestions(round))]
      )
    } else if (exists.status === "open") {
      await db.run("UPDATE fantasy_rounds SET deadline = ? WHERE id = ?", [deadline, exists.id])
    }
  }

  // 2. Lock + resolve rounds whose deadline has passed.
  const pending = await db.all<RoundRow>(
    "SELECT * FROM fantasy_rounds WHERE season = ? AND status != 'resolved'", [season]
  )
  for (const r of pending) {
    if (Date.parse(r.deadline) > now) continue
    if (r.status === "open") await db.run("UPDATE fantasy_rounds SET status = 'locked' WHERE id = ?", [r.id])

    const results = await fetchRaceResults(season, r.round).catch(() => null)
    if (!results || !results.results?.length) continue
    const quali = await fetchQualifyingResults(season, r.round).catch(() => null)
    const pole = (quali?.results as { position: string; driverCode: string }[] | undefined)?.find((q) => q.position === "1")?.driverCode ?? null
    await resolveRound(db, r, results.results as RaceRow[], pole)
    // Resolve the salary-cap (team) side of the same round. Best-effort: a failure
    // here must not block the prediction game from being marked resolved above.
    try {
      await resolveFantasyTeamRound(db, season, r.id, results.results as unknown as RaceResultRow[], (quali?.results as unknown as QualiResultRow[]) || [])
    } catch { /* team-mode scoring is best-effort */ }
  }
}

async function resolveRound(db: DbQuery, round: RoundRow, raceRows: RaceRow[], pole: string | null) {
  let questions: QKey[] = []
  try { questions = JSON.parse(round.questions) } catch { return }

  const entries = await db.all<{ id: string; answers: string }>(
    "SELECT id, answers FROM fantasy_entries WHERE round_id = ?", [round.id]
  )

  await db.transaction(async (db) => {
    for (const e of entries) {
      let answers: Record<string, unknown> = {}
      try { answers = JSON.parse(e.answers) } catch {}
      const { points, breakdown } = scoreRound(answers, questions, raceRows, pole)
      await db.run("UPDATE fantasy_entries SET points = ?, breakdown = ? WHERE id = ?", [points, JSON.stringify(breakdown), e.id])
    }
    await db.run("UPDATE fantasy_rounds SET status = 'resolved', resolved_at = NOW() WHERE id = ?", [round.id])
  })
}