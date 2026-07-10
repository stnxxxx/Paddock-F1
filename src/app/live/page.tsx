"use client"

import { Header } from "@/components/layout/header"
import { LiveChat } from "@/components/live/live-chat"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiStandings } from "@/lib/api"
import type { LiveSnapshot, LiveDriverSnapshot, LiveEvent } from "@/lib/f1/types"
import { useCountdown } from "@/lib/f1/use-live-ticker"
import { cn } from "@/lib/utils"
import {
  AlertTriangle, CalendarClock, ChevronDown, ChevronUp, CloudSun, Flag, Medal,
  Minus, Radio, Trophy, Wind, Wrench,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

// ── helpers ─────────────────────────────────────────────────────────────────

function formatLap(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "string") return value
  if (!Number.isFinite(value)) return "—"
  const mins = Math.floor(value / 60)
  const secs = value % 60
  return mins > 0 ? `${mins}:${secs.toFixed(3).padStart(6, "0")}` : secs.toFixed(3)
}

function gapText(v?: number | string | null): string {
  if (v === null || v === undefined || v === "") return ""
  if (typeof v === "number") return `+${v.toFixed(3)}`
  return String(v)
}

const TYRE: Record<string, { c: string; label: string }> = {
  S: { c: "#e10600", label: "S" }, M: { c: "#f5d000", label: "M" }, H: { c: "#e8e8e8", label: "H" },
  I: { c: "#3fbf3f", label: "I" }, W: { c: "#2f7fff", label: "W" },
}
function tyre(t?: string) {
  if (!t) return null
  return TYRE[t.trim().charAt(0).toUpperCase()] || null
}
function drsActive(d?: LiveDriverSnapshot["telemetry"]) {
  return d?.drs != null && [10, 12, 14].includes(d.drs)
}

// ── live: broadcast tower ────────────────────────────────────────────────────

function DriverRow({ d, delta, maxGap, mine }: { d: LiveDriverSnapshot; delta: number; maxGap: number; mine: boolean }) {
  const color = d.teamColor ? `#${d.teamColor.replace(/^#/, "")}` : getTeamColor(d.team || "")
  const ty = tyre(d.tyre)
  const numericGap = typeof d.gapToLeader === "number" ? d.gapToLeader : null
  const barPct = numericGap != null && maxGap > 0 ? Math.min(100, (numericGap / maxGap) * 100) : 0

  return (
    <div
      className={cn(
        "grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 border-b border-[--border-default] px-3 py-2 last:border-0 transition-colors",
        mine ? "bg-[--accent]/8" : "hover:bg-[--bg-elevated]"
      )}
      style={mine ? { boxShadow: "inset 3px 0 0 var(--color-accent)" } : undefined}
    >
      {/* position + delta */}
      <div className="flex items-center gap-1">
        <span className="w-5 text-center font-mono text-sm font-bold tabular-nums text-[--text-primary]">{d.position ?? "–"}</span>
        {delta > 0 ? <ChevronUp className="h-3.5 w-3.5 text-emerald-400" />
          : delta < 0 ? <ChevronDown className="h-3.5 w-3.5 text-[--destructive]" />
          : <Minus className="h-3 w-3 text-[--text-placeholder]" />}
      </div>

      {/* driver + gap bar */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2 shrink-0 self-stretch rounded-full" style={{ backgroundColor: color, minHeight: 18 }} />
          <span className="font-mono text-[15px] font-bold leading-none" style={{ color }}>{d.code}</span>
          {d.team && <TeamLogo team={d.team} size={15} />}
          {ty && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-black" style={{ backgroundColor: ty.c }}>{ty.label}</span>
          )}
          {drsActive(d.telemetry) && <span className="rounded bg-emerald-400/15 px-1 text-[9px] font-bold text-emerald-400">DRS</span>}
        </div>
        {/* gap visualization */}
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[--bg-elevated]">
            <div className="h-full rounded-full" style={{ width: `${d.position === 1 ? 0 : barPct}%`, backgroundColor: color, opacity: 0.7 }} />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-[--text-secondary]">
            {d.position === 1 ? "Лидер" : gapText(d.gapToLeader ?? d.interval)}
          </span>
        </div>
      </div>

      {/* last lap */}
      <div className="text-right">
        <div className="font-mono text-xs tabular-nums text-[--text-primary]">{formatLap(d.lastLap)}</div>
        <div className="font-mono text-[10px] text-[--text-muted]">{d.lapNumber ? `круг ${d.lapNumber}` : ""}</div>
      </div>
    </div>
  )
}

function BroadcastTower({ snapshot, deltas, myDriver }: { snapshot: LiveSnapshot; deltas: Record<number, number>; myDriver?: string | null }) {
  const drivers = [...snapshot.drivers].filter((d) => d.position != null).sort((a, b) => a.position! - b.position!)
  const maxGap = drivers.reduce((m, d) => (typeof d.gapToLeader === "number" && d.gapToLeader > m ? d.gapToLeader : m), 0)
  const mine = myDriver ? drivers.find((d) => d.code === myDriver) : undefined

  return (
    <div className="flex flex-col gap-4">
      {mine && (
        <div className="rounded-lg border border-[--accent]/40 bg-[--accent]/5 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[--accent]">Твой пилот</div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-black" style={{ color: mine.teamColor ? `#${mine.teamColor.replace(/^#/, "")}` : getTeamColor(mine.team || "") }}>{mine.code}</span>
            <div className="text-sm">
              <div className="font-semibold text-[--text-primary]">P{mine.position} · {mine.position === 1 ? "лидирует" : gapText(mine.gapToLeader)}</div>
              <div className="text-xs text-[--text-muted]">{formatLap(mine.lastLap)} {mine.tyre ? `· ${tyre(mine.tyre)?.label || mine.tyre}` : ""}</div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
        <div className="flex items-center justify-between border-b border-[--border-default] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[--gold]" />
            <h2 className="text-sm font-semibold">Классификация</h2>
          </div>
          <span className="text-[11px] text-[--text-muted]">{drivers.length} пилотов</span>
        </div>
        {drivers.map((d) => (
          <DriverRow key={d.driverNumber} d={d} delta={deltas[d.driverNumber] || 0} maxGap={maxGap} mine={!!myDriver && d.code === myDriver} />
        ))}
      </div>
    </div>
  )
}

const EVENT_ICON = { pit: Wrench, weather: CloudSun, radio: Radio, race_control: Flag, source: AlertTriangle } as const
function EventsFeed({ events }: { events: LiveEvent[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
      <div className="flex items-center gap-2 border-b border-[--border-default] px-4 py-3">
        <Radio className="h-4 w-4 text-[--purple]" />
        <h2 className="text-sm font-semibold">События</h2>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {events.length === 0 ? (
          <p className="p-6 text-center text-sm text-[--text-muted]">Событий пока нет.</p>
        ) : events.map((e, i) => {
          const Icon = EVENT_ICON[e.type] || Flag
          const color = e.severity === "danger" ? "var(--color-destructive)" : e.severity === "warning" ? "var(--color-warning)" : "var(--color-text-secondary)"
          return (
            <div key={i} className="rounded-md p-2 hover:bg-[--bg-elevated]">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                <Icon className="h-3.5 w-3.5" /> {e.title}
                {e.lapNumber ? <span className="ml-auto font-mono text-[10px] text-[--text-muted]">круг {e.lapNumber}</span> : null}
              </div>
              {e.message && <p className="mt-0.5 text-xs text-[--text-muted]">{e.message}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeatherCard({ weather }: { weather: NonNullable<LiveSnapshot["weather"]> }) {
  const cells = [
    { label: "Воздух", value: `${weather.airTemp ?? "—"}°` },
    { label: "Трасса", value: `${weather.trackTemp ?? "—"}°` },
    { label: "Влажность", value: `${weather.humidity ?? "—"}%` },
    { label: "Ветер", value: `${weather.windSpeed ?? "—"} м/с`, icon: Wind },
  ]
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="mb-3 flex items-center gap-2"><CloudSun className="h-4 w-4 text-[--blue]" /><h2 className="text-sm font-semibold">Погода</h2></div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-md bg-[--bg-elevated] p-2">
              <div className="flex items-center gap-1 text-[10px] uppercase text-[--text-muted]">{Icon && <Icon className="h-3 w-3" />}{c.label}</div>
              <div className="font-mono font-bold">{c.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── non-live: weekend hub ─────────────────────────────────────────────────────

function eventLabel(name: string): string {
  if (/^Practice 1/i.test(name)) return "Практика 1"
  if (/^Practice 2/i.test(name)) return "Практика 2"
  if (/^Practice 3/i.test(name)) return "Практика 3"
  if (/Sprint Qualifying/i.test(name)) return "Спринт-квалификация"
  if (/Qualifying/i.test(name)) return "Квалификация"
  if (/Practice/i.test(name)) return "Практика"
  return name
}

function WeekendHub({ snapshot, standings }: { snapshot: LiveSnapshot | null; standings: ApiStandings | null }) {
  const next = standings?.nextRace
  const sessionStart = snapshot?.session?.startsAt ? Date.parse(snapshot.session.startsAt) : NaN
  const nextRaceMs = next ? Date.parse(`${next.date}T12:00:00Z`) : NaN
  const [target, setTarget] = useState<number | null>(null)
  useEffect(() => {
    const now = Date.now()
    setTarget(Number.isFinite(sessionStart) && sessionStart > now ? sessionStart : Number.isFinite(nextRaceMs) ? nextRaceMs : null)
  }, [sessionStart, nextRaceMs])
  const countdown = useCountdown(target)
  const sessionName = snapshot?.session?.name && snapshot.mode === "countdown" ? snapshot.session.name : null

  // Secondary countdown to the nearest practice/qualifying before the race.
  const [nextEvent, setNextEvent] = useState<{ name: string; type: string; date: string } | null>(null)
  useEffect(() => {
    fetch("/api/f1/next-event", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setNextEvent(d?.event ?? null))
      .catch(() => {})
  }, [])
  const eventMs = nextEvent ? Date.parse(nextEvent.date) : NaN
  // Hide it when the hero timer is already counting to this same session.
  const eventTarget =
    Number.isFinite(eventMs) && eventMs > Date.now() && !(target != null && Math.abs(target - eventMs) < 60_000)
      ? eventMs
      : null
  const eventCountdown = useCountdown(eventTarget)

  const last = standings?.lastRace
  const podiumColors = ["var(--color-gold)", "#c0c0cc", "#cd7f32"]

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4">
      {/* countdown hero */}
      <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
        <div className="flex flex-col items-center gap-1 border-b border-[--border-default] px-6 py-8 text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">
            <CalendarClock className="h-3.5 w-3.5" /> {sessionName ? `До сессии — ${sessionName}` : "До следующей гонки"}
          </div>
          {countdown ? (
            <div className="font-mono text-4xl font-black tabular-nums text-[--text-primary] md:text-5xl">{countdown}</div>
          ) : (
            <div className="text-2xl font-bold text-[--text-muted]">Расписание уточняется</div>
          )}
          {eventCountdown && nextEvent && (
            <div className="mt-1.5 flex items-center gap-2 rounded-full bg-[--bg-elevated] px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted]">
                До {eventLabel(nextEvent.name)}
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-[--accent]">{eventCountdown}</span>
            </div>
          )}
          {next && (
            <Link href={`/race/${standings?.season || "2026"}/${next.round}`} className="mt-1 text-sm font-semibold text-[--text-primary] hover:text-[--accent] transition-colors">
              {next.name} · {next.circuit}, {next.country}
            </Link>
          )}
        </div>
        <div className="px-6 py-3 text-center text-[12px] text-[--text-muted]">
          Live timing включится автоматически, как только начнётся сессия.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {/* last race */}
          {last && last.results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
              <div className="flex items-center justify-between border-b border-[--border-default] px-4 py-3">
                <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-[--gold]" /><h2 className="text-sm font-semibold">Последняя гонка · {last.raceName}</h2></div>
                <Link href={`/race/${standings?.season || "2026"}/${last.round}`} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">подробно</Link>
              </div>
              {/* podium */}
              <div className="grid grid-cols-3 gap-2 p-3">
                {last.results.slice(0, 3).map((r, i) => (
                  <div key={r.driverCode} className="flex flex-col items-center rounded-lg border border-[--border-default] bg-[--bg-elevated] p-3">
                    <Medal className="h-5 w-5" style={{ color: podiumColors[i] }} />
                    <span className="mt-1 font-mono text-lg font-black" style={{ color: getTeamColor(r.constructorName) }}>{r.driverCode}</span>
                    <span className="text-[10px] text-[--text-muted]">{r.time || r.status}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3">
                {last.results.slice(3, 10).map((r) => (
                  <div key={r.driverCode} className="flex items-center gap-2 py-1 text-[12px]">
                    <span className="w-5 text-center font-mono font-bold text-[--text-muted]">{r.position}</span>
                    <span className="font-mono font-bold" style={{ color: getTeamColor(r.constructorName) }}>{r.driverCode}</span>
                    <TeamLogo team={r.constructorName} size={13} />
                    <span className="ml-auto font-mono text-[11px] text-[--text-muted]">{r.time || r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* championship */}
          {standings && (
            <div className="grid gap-4 sm:grid-cols-2">
              <StandingsCard title="Пилоты" rows={standings.drivers.slice(0, 5).map((d) => ({ code: d.driver || "", name: d.surname || d.team, color: d.color, pts: d.pts, team: d.team }))} />
              <StandingsCard title="Кубок конструкторов" rows={standings.constructors.slice(0, 5).map((c) => ({ code: "", name: c.team, color: c.color, pts: c.pts, team: c.team }))} />
            </div>
          )}
        </div>

        <LiveChat room="global" title="Чат эфира" subtitle="Общий чат сообщества" />
      </div>
    </div>
  )
}

function StandingsCard({ title, rows }: { title: string; rows: { code: string; name?: string; color: string; pts: number; team: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
      <div className="flex items-center gap-2 border-b border-[--border-default] px-4 py-2.5"><Trophy className="h-3.5 w-3.5 text-[--gold]" /><h3 className="text-xs font-semibold uppercase tracking-wider text-[--text-muted]">{title}</h3></div>
      <div className="p-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-[--bg-elevated]">
            <span className="w-4 text-center font-mono font-bold text-[--text-muted]">{i + 1}</span>
            <TeamLogo team={r.team} size={14} />
            {r.code && <span className="font-mono font-bold" style={{ color: r.color }}>{r.code}</span>}
            <span className="min-w-0 flex-1 truncate text-[--text-secondary]">{r.name}</span>
            <span className="font-mono font-bold tabular-nums text-[--text-primary]">{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LivePage() {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [standings, setStandings] = useState<ApiStandings | null>(null)
  const [loading, setLoading] = useState(true)
  const prevPos = useRef<Record<number, number>>({})
  const [deltas, setDeltas] = useState<Record<number, number>>({})

  useEffect(() => {
    api.getStandings().then(setStandings).catch(() => {})
    fetch("/api/f1/live/current", { cache: "no-store" }).then((r) => r.json()).then((s) => { setSnapshot(s); setLoading(false) }).catch(() => setLoading(false))

    const es = new EventSource("/api/f1/live/stream")
    es.addEventListener("snapshot", (e) => {
      const snap = JSON.parse((e as MessageEvent).data) as LiveSnapshot
      // position deltas vs the previous snapshot
      const next: Record<number, number> = {}
      for (const d of snap.drivers) {
        if (d.position != null && prevPos.current[d.driverNumber] != null) next[d.driverNumber] = prevPos.current[d.driverNumber] - d.position
      }
      setDeltas(next)
      prevPos.current = Object.fromEntries(snap.drivers.filter((d) => d.position != null).map((d) => [d.driverNumber, d.position!]))
      setSnapshot(snap)
      setLoading(false)
    })
    return () => es.close()
  }, [])

  const isLive = snapshot?.mode === "live" && (snapshot?.drivers?.length ?? 0) > 0

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center text-sm text-[--text-muted]">Загружаем…</main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4">
          {/* compact header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--live] opacity-60" />}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", isLive ? "bg-[--live]" : "bg-[--text-muted]")} />
              </span>
              <h1 className="text-xl font-bold">{isLive ? "Live" : "Эфир"}</h1>
              {isLive && snapshot?.session?.name && (
                <span className="rounded-md bg-[--live]/10 px-2 py-0.5 text-[11px] font-semibold text-[--live]">{snapshot.session.name}{snapshot.session.circuit ? ` · ${snapshot.session.circuit}` : ""}</span>
              )}
            </div>
            {!isLive && <span className="text-[11px] text-[--text-muted]">Нет активной сессии</span>}
          </div>

          {isLive && snapshot ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <BroadcastTower snapshot={snapshot} deltas={deltas} myDriver={user?.driver} />
              <aside className="flex flex-col gap-4">
                <EventsFeed events={snapshot.events} />
                {snapshot.weather && <WeatherCard weather={snapshot.weather} />}
                <LiveChat room="global" title="Чат эфира" subtitle="Общий чат сообщества" />
              </aside>
            </div>
          ) : (
            <WeekendHub snapshot={snapshot} standings={standings} />
          )}
        </div>
      </main>
    </div>
  )
}
