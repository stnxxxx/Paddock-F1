"use client"

import { Marquee } from "@/components/ui/marquee"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { useLiveTicker, usePrefersReducedMotion } from "@/lib/f1/use-live-ticker"
import type { LiveSnapshot, LiveDriverSnapshot, LiveEvent } from "@/lib/f1/types"
import Link from "next/link"
import { Flag, Trophy, Lightbulb, Radio, AlertTriangle, Wrench } from "lucide-react"

// ── formatting helpers ────────────────────────────────────────────────────

function formatLap(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—"
  if (sec < 60) return sec.toFixed(3)
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(3).padStart(6, "0")
  return `${m}:${s}`
}

function formatGap(v: number | string | null | undefined): string {
  if (v == null || v === "") return ""
  if (typeof v === "number") return `+${v.toFixed(3)}`
  return String(v)
}

const TYRE_COLOR: Record<string, string> = {
  S: "#e10600", M: "#f5d000", H: "#e8e8e8", I: "#3fbf3f", W: "#2f7fff",
}
function tyreLetter(tyre?: string): { letter: string; color: string } | null {
  if (!tyre) return null
  const letter = tyre.trim().charAt(0).toUpperCase()
  const color = TYRE_COLOR[letter]
  if (!color) return null
  return { letter, color }
}

const SESSION_LABELS: Record<string, string> = {
  race: "Гонка",
  qualifying: "Квалификация",
  sprint: "Спринт",
  sprint_qualifying: "Спринт-квалификация",
  sprint_shootout: "Спринт-квалификация",
  practice: "Практика",
  fp1: "Практика 1", fp2: "Практика 2", fp3: "Практика 3",
}
function sessionLabel(snap: LiveSnapshot | null): string {
  if (!snap?.session) return "Сессия"
  const key = (snap.session.type || snap.session.name || "").toLowerCase().replace(/\s+/g, "_")
  return SESSION_LABELS[key] || snap.session.name || "Сессия"
}

const EVENT_STYLE: Record<NonNullable<LiveEvent["severity"]>, { color: string; bg: string }> = {
  info: { color: "var(--color-blue)", bg: "color-mix(in srgb, var(--color-blue) 12%, transparent)" },
  warning: { color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)" },
  danger: { color: "var(--color-destructive)", bg: "color-mix(in srgb, var(--color-destructive) 14%, transparent)" },
}
function eventIcon(type: LiveEvent["type"]) {
  if (type === "pit") return Wrench
  if (type === "weather") return AlertTriangle
  if (type === "radio") return Radio
  return Flag
}

// ── item pill ─────────────────────────────────────────────────────────────

function Pill({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 h-7 rounded-md bg-[--bg-elevated] border border-[--border-default] shrink-0 cursor-default text-[11px]"
      style={style}
    >
      {children}
    </div>
  )
}

// ── per-mode item builders ──────────────────────────────────────────────────

function liveItems(snap: LiveSnapshot): React.ReactNode[] {
  const items: React.ReactNode[] = []

  const events = (snap.events || []).filter((e) => e.type !== "source").slice(0, 4)
  for (const ev of events) {
    const st = EVENT_STYLE[ev.severity || "info"]
    const Icon = eventIcon(ev.type)
    items.push(
      <Pill key={`ev-${ev.title}-${ev.time ?? ""}`} style={{ borderColor: st.color, backgroundColor: st.bg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
        <span className="font-semibold" style={{ color: st.color }}>{ev.title}</span>
        {ev.message && <span className="text-[--text-secondary] max-w-[260px] truncate">{ev.message}</span>}
      </Pill>
    )
  }

  const drivers = [...(snap.drivers || [])]
    .filter((d) => d.position != null)
    .sort((a, b) => (a.position! - b.position!))
    .slice(0, 20)

  for (const d of drivers) {
    items.push(<LiveDriverPill key={`d-${d.driverNumber}`} d={d} />)
  }
  return items
}

function LiveDriverPill({ d }: { d: LiveDriverSnapshot }) {
  const tyre = tyreLetter(d.tyre)
  const gap = d.position === 1 ? "Лидер" : formatGap(d.gapToLeader ?? d.interval)
  return (
    <Pill>
      <span className="font-mono font-bold text-[--text-muted] w-4 text-right">{d.position}</span>
      <span className="font-mono font-bold" style={{ color: d.teamColor ? `#${d.teamColor.replace(/^#/, "")}` : getTeamColor(d.team || "") }}>
        {d.code}
      </span>
      {d.team && <TeamLogo team={d.team} size={13} />}
      {gap && <span className="font-mono tabular-nums text-[--text-secondary]">{gap}</span>}
      {tyre && (
        <span className="font-mono font-bold text-[10px] w-3.5 text-center" style={{ color: tyre.color }}>{tyre.letter}</span>
      )}
      {d.lastLap != null && <span className="font-mono tabular-nums text-[--text-muted]">{formatLap(d.lastLap)}</span>}
    </Pill>
  )
}

// Outside a live session the ticker shows F1 trivia — standings, results and the next-race
// countdown live in the sidebar, so the ticker doesn't duplicate them.
const FACTS = [
  "Ferrari — единственная команда, выступающая в F1 каждый сезон с 1950 года.",
  "Самый быстрый пит-стоп в истории — 1.80 с, McLaren, Гран-при Катара 2023.",
  "Льюис Хэмилтон и Михаэль Шумахер делят рекорд по титулам — по 7.",
  "Монако — самая короткая трасса календаря: 3.337 км.",
  "Спа — самая длинная трасса календаря: 7.004 км.",
  "DRS даёт прибавку до 15–20 км/ч на прямых.",
  "Pirelli привозит составы от C0 (самый жёсткий) до C5 (самый мягкий).",
  "Первый Гран-при Формулы 1 прошёл в Сильверстоуне 13 мая 1950 года.",
  "Рекорд побед за сезон — 19 из 22 у Макса Ферстаппена в 2023 году.",
  "Болид F1 разгоняется 0–100 км/ч примерно за 2.6 секунды.",
]

function factItems(): React.ReactNode[] {
  return FACTS.map((fact, i) => (
    <Pill key={`fact-${i}`}>
      <Lightbulb className="h-3.5 w-3.5 text-[--gold]" />
      <span className="max-w-[460px] truncate text-[--text-secondary]">{fact}</span>
    </Pill>
  ))
}

// ── status chip ─────────────────────────────────────────────────────────────

function StatusChip({
  label, color, pulse, sub, href,
}: { label: string; color: string; pulse?: boolean; sub?: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0 group">
      <span className="relative flex h-2 w-2">
        {pulse && <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <span className="font-display text-[11px] font-bold tracking-widest" style={{ color }}>{label}</span>
      {sub && <span className="hidden text-[11px] text-[--text-muted] group-hover:text-[--text-secondary] transition-colors sm:inline max-w-[220px] truncate">{sub}</span>}
    </Link>
  )
}

// ── main ──────────────────────────────────────────────────────────────────

export function HeaderTicker() {
  const { mode, snapshot, standings, loading } = useLiveTicker()
  const reducedMotion = usePrefersReducedMotion()

  // Only a running session shows live timing; everything else shows trivia (the sidebar
  // owns standings / results / next-race countdown).
  const isLive = mode === "live" && (snapshot?.drivers?.length ?? 0) > 0

  let chip: React.ReactNode
  let items: React.ReactNode[]

  if (isLive && snapshot) {
    const lap = snapshot.drivers?.find((d) => d.lapNumber)?.lapNumber
    chip = <StatusChip label="LIVE" color="var(--color-live)" pulse href="/live" sub={`${sessionLabel(snapshot)}${lap ? ` · круг ${lap}` : ""}`} />
    items = liveItems(snapshot)
  } else if (mode === "countdown") {
    chip = <StatusChip label="СКОРО" color="var(--color-warning)" pulse href="/live" sub={sessionLabel(snapshot)} />
    items = factItems()
  } else {
    chip = <StatusChip label="F1" color="var(--color-text-muted)" href="/live" sub="Эфир" />
    items = factItems()
  }

  return (
    <div className="border-t border-[--glass-border]">
      <div className="mx-auto flex h-10 max-w-[1280px] items-center gap-4 px-5">
        {chip}

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <span className="text-[11px] text-[--text-muted]">Загрузка…</span>
          ) : items.length === 0 ? (
            <span className="text-[11px] text-[--text-muted]">Нет данных</span>
          ) : reducedMotion ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">{items}</div>
          ) : (
            <Marquee pauseOnHover className="py-0 [--duration:40s] [--gap:0.5rem]" repeat={2}>
              {items}
            </Marquee>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0 text-[10px] font-mono text-[--text-muted]">
          <Trophy className="w-3 h-3 text-[--gold]" />
          <span>{standings?.season || "2026"}</span>
          <span>{standings?.totalRaces || 24} гонок</span>
        </div>
      </div>
    </div>
  )
}
