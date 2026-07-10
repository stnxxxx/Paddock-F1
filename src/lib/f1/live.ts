import { getCurrentCalendar, getNextRace } from "./jolpica"
import { getLatestSession, getLiveDriverSnapshots, getLiveEvents, getLatestWeather } from "./openf1"
import { LiveSnapshot, SourceHealth } from "./types"

function source(source: SourceHealth["source"], ok: boolean, startedAt: number, message?: string): SourceHealth {
  return {
    source,
    ok,
    latencyMs: Date.now() - startedAt,
    message,
    checkedAt: new Date().toISOString(),
  }
}

function getMode(startsAt?: string, endsAt?: string): LiveSnapshot["mode"] {
  const now = Date.now()
  const start = startsAt ? Date.parse(startsAt) : Number.NaN
  const end = endsAt ? Date.parse(endsAt) : Number.NaN
  if (Number.isFinite(start) && now < start - 60 * 60 * 1000) return "countdown"
  if (Number.isFinite(start) && now < start) return "pre-session"
  if (Number.isFinite(end) && now <= end) return "live"
  return "post-session"
}

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const generatedAt = new Date().toISOString()
  const health: SourceHealth[] = []
  const openStart = Date.now()

  try {
    const session = await getLatestSession()
    health.push(source("openf1", true, openStart))

    if (!session) throw new Error("OpenF1 не вернул текущую сессию")

    const mode = getMode(session.date_start, session.date_end)
    const [drivers, events, weather] = await Promise.all([
      getLiveDriverSnapshots(session.session_key),
      getLiveEvents(session.session_key),
      getLatestWeather(session.session_key),
    ])

    // Live timing is only meaningful while a session is actually running. OpenF1 keeps
    // returning the latest (possibly long-finished) session's classification, so outside
    // the live window we drop the driver data — the page shows the weekend hub instead.
    const isLive = mode === "live"

    return {
      mode,
      generatedAt,
      session: {
        meetingKey: session.meeting_key,
        sessionKey: session.session_key,
        name: session.session_name,
        type: session.session_type,
        status: mode,
        startsAt: session.date_start,
        endsAt: session.date_end,
        location: session.location,
        country: session.country_name,
        circuit: session.circuit_short_name,
      },
      sources: health,
      drivers: isLive ? drivers : [],
      events: isLive ? events : [],
      weather: isLive ? weather : undefined,
    }
  } catch (error) {
    health.push(source("openf1", false, openStart, error instanceof Error ? error.message : "OpenF1 недоступен"))
  }

  const jolpicaStart = Date.now()
  try {
    const [nextRace, calendar] = await Promise.all([getNextRace(), getCurrentCalendar()])
    health.push(source("jolpica", true, jolpicaStart))

    return {
      mode: "delayed",
      generatedAt,
      session: {
        status: "live data delayed",
        startsAt: nextRace ? `${nextRace.date}T${nextRace.time || "12:00:00Z"}` : undefined,
        name: nextRace?.name,
        country: nextRace?.country,
        circuit: nextRace?.circuit,
      },
      sources: health,
      drivers: [],
      events: [{
        type: "source",
        title: "Live timing временно недоступен",
        message: "Показываем календарь и результаты из Jolpica. Данные OpenF1 будут подключены автоматически после восстановления источника.",
        severity: "warning",
      }],
      fallback: {
        nextRace,
        lastRaceName: calendar.filter((race) => Date.parse(race.date) < Date.now()).at(-1)?.name,
        message: "OpenF1 недоступен или сессия ещё не началась.",
      },
    }
  } catch (error) {
    health.push(source("jolpica", false, jolpicaStart, error instanceof Error ? error.message : "Jolpica недоступен"))
  }

  return {
    mode: "delayed",
    generatedAt,
    session: { status: "all sources unavailable" },
    sources: health,
    drivers: [],
    events: [{
      type: "source",
      title: "Источники F1-данных недоступны",
      message: "Попробуйте обновить страницу через несколько минут.",
      severity: "danger",
    }],
  }
}
