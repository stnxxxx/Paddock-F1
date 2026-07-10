"use client"

import { Header } from "@/components/layout/header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useEffect, useState } from "react"

interface TeamRank { team: string; color: string; value: number; delta: number }
interface DriverStat {
  driver: string; code: string; team: string; color: string
  bestLap: number; s1: number; s2: number; s3: number; ideal: number; topSpeed: number
}
interface StintInfo {
  driver: string; code: string; team: string; color: string
  stints: { compound: string; laps: number; lapStart: number; lapEnd: number }[]
}
interface PitStop { driver: string; code: string; team: string; color: string; lap: number | null; duration: number }
interface Weather { airTemp?: number; trackTemp?: number; humidity?: number; rainfall?: number; windSpeed?: number }
interface Stats {
  sessionKey: number
  sessionName: string | null
  country: string | null
  sectors: { s1: TeamRank[]; s2: TeamRank[]; s3: TeamRank[]; ideal: TeamRank[] }
  speeds: { i1: TeamRank[]; i2: TeamRank[]; st: TeamRank[] }
  drivers: DriverStat[]
  stints: StintInfo[]
  pits: PitStop[]
  weather: Weather | null
}
interface SessionItem { key: number; name: string; type: string; country: string; date: string }

const TEAM_RU: Record<string, string> = {
  Mercedes: "Мерседес", Ferrari: "Феррари", McLaren: "Макларен",
  "Red Bull Racing": "Ред Булл", "Racing Bulls": "Рейсинг Буллз", Alpine: "Альпин",
  Williams: "Вильямс", Haas: "Хаас", Audi: "Ауди", Cadillac: "Кадиллак",
  "Aston Martin": "Астон Мартин", Sauber: "Заубер",
}
const ru = (t: string) => (TEAM_RU[t] ?? t).toUpperCase()

const COMPOUND: Record<string, { bg: string; fg: string; label: string }> = {
  SOFT: { bg: "#e10600", fg: "#fff", label: "S" },
  MEDIUM: { bg: "#f5c542", fg: "#1a1a1a", label: "M" },
  HARD: { bg: "#e8e8e8", fg: "#1a1a1a", label: "H" },
  INTERMEDIATE: { bg: "#43b02a", fg: "#fff", label: "I" },
  WET: { bg: "#1e6fff", fg: "#fff", label: "W" },
}
const compound = (c: string) => COMPOUND[c?.toUpperCase()] ?? { bg: "#666", fg: "#fff", label: "?" }

function sectorText(v: number, ideal: boolean): string {
  if (ideal && v >= 60) {
    const m = Math.floor(v / 60)
    const s = (v % 60).toFixed(3).padStart(6, "0")
    return `${m}:${s}`
  }
  return `${v.toFixed(3)} с`
}
function lapTime(v: number): string {
  if (!v || v <= 0) return "—"
  if (v < 60) return `${v.toFixed(3)}`
  const m = Math.floor(v / 60)
  return `${m}:${(v % 60).toFixed(3).padStart(6, "0")}`
}

function Board({ title, rows, kind }: { title: string; rows: TeamRank[]; kind: "sector" | "ideal" | "speed" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-md bg-[--bg-elevated] px-3 py-2 text-center text-sm font-semibold text-[--text-secondary]">{title}</div>
      {rows.map((r, i) => {
        const leader = i === 0
        const valueText =
          kind === "speed"
            ? `${Math.round(r.value)}${leader ? " км/ч" : ""}`
            : leader ? sectorText(r.value, kind === "ideal") : `+${r.delta.toFixed(3)} с`
        return (
          <div key={r.team} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-sm font-bold tabular-nums text-[--text-muted]">{i + 1}</span>
            <div className="flex h-9 flex-1 items-center justify-between rounded-md px-3" style={{ backgroundColor: r.color }}>
              <span className="truncate text-sm font-bold text-white drop-shadow">{ru(r.team)}</span>
              <span className="shrink-0 pl-2 text-sm font-bold tabular-nums text-white drop-shadow">{valueText}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DriverTable({ drivers }: { drivers: DriverStat[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[--border-default]">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[--border-default] text-left text-xs uppercase text-[--text-muted]">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Пилот</th>
            <th className="px-3 py-2 text-right font-medium">Круг</th>
            <th className="px-3 py-2 text-right font-medium">Идеал</th>
            <th className="px-3 py-2 text-right font-medium">С1</th>
            <th className="px-3 py-2 text-right font-medium">С2</th>
            <th className="px-3 py-2 text-right font-medium">С3</th>
            <th className="px-3 py-2 text-right font-medium">Vmax</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d, i) => (
            <tr key={d.code + i} className="border-b border-[--border-default] last:border-0">
              <td className="px-3 py-2 tabular-nums text-[--text-muted]">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="font-medium text-[--text-primary]">{d.driver}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-[--text-primary]">{lapTime(d.bestLap)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-secondary]">{lapTime(d.ideal)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-muted]">{d.s1 ? d.s1.toFixed(3) : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-muted]">{d.s2 ? d.s2.toFixed(3) : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-muted]">{d.s3 ? d.s3.toFixed(3) : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-secondary]">{d.topSpeed ? `${d.topSpeed}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StintsView({ stints }: { stints: StintInfo[] }) {
  if (stints.length === 0) return <p className="py-10 text-center text-[--text-muted]">Нет данных по шинам для этой сессии</p>
  return (
    <div className="flex flex-col gap-2.5">
      {stints.map((d, i) => {
        const total = d.stints.reduce((s, st) => s + Math.max(st.laps, 1), 0) || 1
        return (
          <div key={d.code + i} className="flex items-center gap-3">
            <div className="flex w-32 shrink-0 items-center gap-2">
              <span className="h-3.5 w-1 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="truncate text-sm font-medium text-[--text-primary]">{d.driver}</span>
            </div>
            <div className="flex h-7 flex-1 overflow-hidden rounded-md">
              {d.stints.map((st, j) => {
                const c = compound(st.compound)
                return (
                  <div
                    key={j}
                    className="flex items-center justify-center text-[11px] font-bold"
                    style={{ width: `${(Math.max(st.laps, 1) / total) * 100}%`, backgroundColor: c.bg, color: c.fg }}
                    title={`${st.compound}: круги ${st.lapStart}–${st.lapEnd}`}
                  >
                    {c.label}
                    {st.laps > 2 ? ` ${st.laps}` : ""}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PitsTable({ pits }: { pits: PitStop[] }) {
  if (pits.length === 0) return <p className="py-10 text-center text-[--text-muted]">Нет данных по пит-стопам для этой сессии</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-[--border-default]">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-[--border-default] text-left text-xs uppercase text-[--text-muted]">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Пилот</th>
            <th className="px-3 py-2 text-right font-medium">Круг</th>
            <th className="px-3 py-2 text-right font-medium">Время в пит-лейне</th>
          </tr>
        </thead>
        <tbody>
          {pits.map((p, i) => (
            <tr key={p.code + i} className="border-b border-[--border-default] last:border-0">
              <td className="px-3 py-2 tabular-nums text-[--text-muted]">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-sm" style={{ backgroundColor: p.color }} />
                  <span className="font-medium text-[--text-primary]">{p.driver}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[--text-muted]">{p.lap ?? "—"}</td>
              <td className={`px-3 py-2 text-right font-semibold tabular-nums ${i === 0 ? "text-[--gold]" : "text-[--text-primary]"}`}>
                {p.duration.toFixed(1)} с
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeatherStrip({ w }: { w: Weather }) {
  const items: { label: string; value: string }[] = []
  if (w.airTemp != null) items.push({ label: "Воздух", value: `${Math.round(w.airTemp)}°C` })
  if (w.trackTemp != null) items.push({ label: "Трасса", value: `${Math.round(w.trackTemp)}°C` })
  if (w.humidity != null) items.push({ label: "Влажность", value: `${Math.round(w.humidity)}%` })
  if (w.windSpeed != null) items.push({ label: "Ветер", value: `${w.windSpeed.toFixed(1)} м/с` })
  if (w.rainfall != null) items.push({ label: "Дождь", value: w.rainfall ? "да" : "нет" })
  if (items.length === 0) return null
  return (
    <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-[--border-default] bg-[--bg-surface] px-4 py-2.5 text-sm">
      {items.map((it) => (
        <span key={it.label} className="text-[--text-muted]">
          {it.label}: <span className="font-semibold text-[--text-primary]">{it.value}</span>
        </span>
      ))}
    </div>
  )
}

export default function TimingPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [sessionKey, setSessionKey] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/f1/sessions")
      .then((r) => r.json())
      .then((d) => {
        const list: SessionItem[] = d.sessions ?? []
        setSessions(list)
        if (list.length) setSessionKey(list[0].key)
        else setLoading(false)
      })
      .catch(() => { setError("Не удалось загрузить сессии"); setLoading(false) })
  }, [])

  useEffect(() => {
    if (sessionKey == null) return
    setLoading(true)
    setError("")
    fetch(`/api/f1/session/${sessionKey}/stats`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setStats(d) })
      .catch(() => setError("Не удалось загрузить статистику сессии"))
      .finally(() => setLoading(false))
  }, [sessionKey])

  const current = sessions.find((s) => s.key === sessionKey)
  const title = current ? `${current.country} · ${current.name}` : ""

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="min-w-0 flex-1 py-6">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[--text-primary]">Тайминги</h1>
              <p className="text-sm text-[--text-muted]">Секторы, скорость, круги и шины по данным OpenF1</p>
            </div>
            {sessions.length > 0 && (
              <Select value={sessionKey ? String(sessionKey) : ""} onValueChange={(v) => setSessionKey(Number(v))}>
                <SelectTrigger size="sm" className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.key} value={String(s.key)}>{s.country} · {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center text-[--text-muted]">Загрузка…</div>
          ) : error ? (
            <div className="py-20 text-center text-[--text-muted]">{error}</div>
          ) : stats ? (
            <>
              {stats.weather && <WeatherStrip w={stats.weather} />}
              <Tabs defaultValue="teams">
              <div className="mb-4 overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="teams">Команды</TabsTrigger>
                  <TabsTrigger value="drivers">Пилоты</TabsTrigger>
                  <TabsTrigger value="tyres">Шины</TabsTrigger>
                  <TabsTrigger value="pits">Пит-стопы</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="teams" className="flex flex-col gap-8">
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-[--text-primary]">Рейтинг по секторам{title ? ` · ${title}` : ""}</h2>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Board title="Сектор 1" rows={stats.sectors.s1} kind="sector" />
                    <Board title="Сектор 2" rows={stats.sectors.s2} kind="sector" />
                    <Board title="Сектор 3" rows={stats.sectors.s3} kind="sector" />
                    <Board title="Идеальный круг" rows={stats.sectors.ideal} kind="ideal" />
                  </div>
                </section>
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-[--text-primary]">Рейтинг по максимальной скорости</h2>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Board title="Замер 1" rows={stats.speeds.i1} kind="speed" />
                    <Board title="Замер 2" rows={stats.speeds.i2} kind="speed" />
                    <Board title="Финишная прямая" rows={stats.speeds.st} kind="speed" />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="drivers">
                <h2 className="mb-3 text-lg font-semibold text-[--text-primary]">Рейтинг пилотов{title ? ` · ${title}` : ""}</h2>
                <DriverTable drivers={stats.drivers} />
              </TabsContent>

              <TabsContent value="tyres">
                <h2 className="mb-3 text-lg font-semibold text-[--text-primary]">Стратегия шин{title ? ` · ${title}` : ""}</h2>
                <StintsView stints={stats.stints} />
              </TabsContent>

              <TabsContent value="pits">
                <h2 className="mb-3 text-lg font-semibold text-[--text-primary]">Пит-стопы{title ? ` · ${title}` : ""}</h2>
                <PitsTable pits={stats.pits} />
              </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
