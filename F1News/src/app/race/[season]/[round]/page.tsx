import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { TeamLogo } from "@/components/ui/team-logo"
import { getPitStops, getQualifyingResults, getRaceResults, getSprintResults } from "@/lib/f1/jolpica"
import { getF1TeamColor } from "@/lib/f1/normalizer"
import { teamSlug } from "@/lib/utils"
import type { F1PitStop, F1QualifyingResult, F1Race, F1RaceResult } from "@/lib/f1/types"
import { ArrowDown, ArrowUp, Flag, Gauge, MapPin, Minus, MonitorPlay, Timer, Trophy, Zap, Clock, Wrench, Crown, TrendingUp, type LucideIcon } from "lucide-react"

interface RacePageProps {
  params: Promise<{ season: string; round: string }>
}

interface RacePageData {
  season: number
  round: number
  race: F1Race | null
  results: F1RaceResult[]
  qualifying: F1QualifyingResult[]
  sprint: F1RaceResult[]
  pitStops: F1PitStop[]
}

function isFinished(status?: string) {
  return status === "Finished" || status === "Lapped" || /^\+\d+ Lap/.test(status || "")
}

async function getRace(season: string, round: string): Promise<RacePageData | null> {
  const seasonNum = Number(season)
  const roundNum = Number(round)
  if (!Number.isFinite(seasonNum) || !Number.isFinite(roundNum)) return null

  try {
    const [race, qualifying, sprint, pitStops] = await Promise.all([
      getRaceResults(seasonNum, roundNum),
      getQualifyingResults(seasonNum, roundNum).catch(() => ({ race: null, results: [] })),
      getSprintResults(seasonNum, roundNum).catch(() => ({ race: null, results: [] })),
      getPitStops(seasonNum, roundNum).catch(() => []),
    ])

    return {
      season: seasonNum,
      round: roundNum,
      race: race.race || qualifying.race,
      results: race.results,
      qualifying: qualifying.results,
      sprint: sprint.results,
      pitStops,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: RacePageProps): Promise<Metadata> {
  const { season, round } = await params
  const data = await getRace(season, round)
  const raceName = data?.race?.name || `Гран-при F1 ${season}, этап ${round}`
  const title = `${raceName} — результаты и статистика F1`
  const description = data?.race
    ? `Результаты, квалификация, пит-стопы и статистика ${data.race.name}: ${data.race.circuit}, ${data.race.country}.`
    : `Данные этапа ${round} сезона F1 ${season}: результаты, квалификация и контекст гонки.`

  return {
    title,
    description,
    alternates: { canonical: `/race/${season}/${round}` },
    openGraph: { title, description, type: "article", images: ["/paddock-og.svg"] },
    twitter: { card: "summary_large_image", title, description, images: ["/paddock-og.svg"] },
  }
}

/* ---------- presentational helpers ---------- */

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: LucideIcon; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[--text-muted]">
        <Icon className="h-3.5 w-3.5" style={color ? { color } : undefined} />
        {label}
      </div>
      <div className="mt-1.5 truncate text-base font-bold text-[--text-primary]">{value}</div>
      {sub && <div className="truncate text-[11px] text-[--text-muted]">{sub}</div>}
    </div>
  )
}

function PosDelta({ grid, position }: { grid?: string; position: string }) {
  const g = Number(grid)
  const p = Number(position)
  if (!g || !p || Number.isNaN(g) || Number.isNaN(p)) return <Minus className="h-3 w-3 text-[--text-muted]" />
  const delta = g - p
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-[--text-muted]"><Minus className="h-3 w-3" /></span>
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-[--live]"><ArrowUp className="h-3 w-3" />{delta}</span>
  return <span className="inline-flex items-center gap-0.5 text-[--downvote]"><ArrowDown className="h-3 w-3" />{Math.abs(delta)}</span>
}

function SectionCard({ icon: Icon, title, iconColor, children, className }: {
  icon: LucideIcon; title: string; iconColor?: string; children: React.ReactNode; className?: string
}) {
  return (
    <section className={`rounded-xl border border-[--border-default] bg-[--bg-surface] ${className || ""}`}>
      <div className="flex items-center gap-2 border-b border-[--border-default] px-4 py-3">
        <Icon className="h-4 w-4" style={iconColor ? { color: iconColor } : undefined} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const MEDAL = ["var(--color-gold)", "#bfbfca", "#cd7f32"]

/* ---------- page ---------- */

export default async function RacePage({ params }: RacePageProps) {
  const { season, round } = await params
  const data = await getRace(season, round)
  const race = data?.race
  const results = data?.results || []
  const qualifying = data?.qualifying || []
  const sprint = data?.sprint || []
  const pitStops = data?.pitStops || []

  // Driver lookup for labelling pit stops (which only carry driverId).
  const byId = new Map<string, F1RaceResult>()
  for (const r of results) if (r.driverId) byId.set(r.driverId, r)

  const winner = results.find((r) => r.position === "1")
  const pole = qualifying.find((q) => q.position === "1")
  const poleName = pole?.driverName || results.find((r) => r.grid === "1")?.driverName
  const fastestLap = results.find((r) => r.fastestLap?.rank === "1")
  const totalLaps = winner?.laps
  const dnfCount = results.filter((r) => results.length && !isFinished(r.status)).length
  const podium = results.filter((r) => Number(r.position) <= 3).slice(0, 3)

  // Biggest mover (grid → finish among classified finishers).
  let mover: { result: F1RaceResult; gain: number } | null = null
  for (const r of results) {
    const gain = Number(r.grid) - Number(r.position)
    if (isFinished(r.status) && Number(r.grid) > 0 && gain > (mover?.gain ?? 0)) mover = { result: r, gain }
  }

  // Pit stops: fastest valid stop + per-driver aggregation.
  const validStops = pitStops.filter((p) => p.durationSec > 0)
  const fastestStop = validStops.length ? validStops.reduce((a, b) => (b.durationSec < a.durationSec ? b : a)) : null
  const stopsByDriver = [...byId.keys()].map((id) => {
    const stops = pitStops.filter((p) => p.driverId === id)
    const best = stops.filter((s) => s.durationSec > 0).reduce<number | null>((m, s) => (m == null || s.durationSec < m ? s.durationSec : m), null)
    return { id, count: stops.length, best, result: byId.get(id)! }
  }).filter((d) => d.count > 0).sort((a, b) => (a.best ?? 99) - (b.best ?? 99))

  // Fastest-lap ranking (each driver's best lap, ordered by Jolpica rank).
  const fastestLaps = results
    .filter((r) => r.fastestLap?.time)
    .sort((a, b) => Number(a.fastestLap!.rank) - Number(b.fastestLap!.rank))
    .slice(0, 10)

  const driverColor = (r: F1RaceResult) => getF1TeamColor(r.constructorName)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-6 min-w-0">
        <div className="mx-auto w-full max-w-[1100px] px-4">
          {/* Hero */}
          <section className="mb-5 border-b border-[--border-default] pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[--text-muted]">
                  <span className="rounded-md bg-[--bg-elevated] px-2 py-1">F1 {season}</span>
                  <span className="rounded-md bg-[--bg-elevated] px-2 py-1">Этап {round}</span>
                  {race?.date && (
                    <span className="rounded-md bg-[--bg-elevated] px-2 py-1">
                      {new Date(race.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  )}
                  {sprint.length > 0 && <span className="rounded-md bg-[--purple]/15 px-2 py-1 font-medium text-[--purple]">Спринт-уикенд</span>}
                </div>
                <h1 className="text-3xl font-bold text-[--text-primary]">{race?.name || `Гран-при F1 ${season}`}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[--text-muted]">
                  {race?.circuit && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {race.circuit}{race.country ? `, ${race.country}` : ""}
                    </span>
                  )}
                  {totalLaps && (
                    <span className="flex items-center gap-1"><Flag className="h-4 w-4" />{totalLaps} кругов</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/watch" className="inline-flex h-9 items-center gap-2 rounded-md bg-[--accent] px-3 text-xs font-semibold text-white transition-colors hover:bg-[--accent-hover]">
                  <MonitorPlay className="h-4 w-4" />Смотреть
                </Link>
                <Link href="/live" className="inline-flex h-9 items-center gap-2 rounded-md border border-[--border-default] bg-[--bg-surface] px-3 text-xs font-semibold text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                  <Gauge className="h-4 w-4 text-[--live]" />Live timing
                </Link>
              </div>
            </div>
          </section>

          {!data || results.length === 0 ? (
            <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-8 text-center text-sm text-[--text-muted]">
              Результаты этапа пока недоступны. Мы покажем статистику уикенда, как только источник обновится.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Weekend facts */}
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={Trophy} color="var(--color-gold)" label="Победитель" value={winner?.driverName?.split(" ").slice(-1)[0] || "—"} sub={winner?.constructorName} />
                <StatCard icon={Crown} color="var(--color-purple)" label="Поул" value={poleName?.split(" ").slice(-1)[0] || "—"} sub={pole?.q3 || "квалификация"} />
                <StatCard icon={Zap} color="var(--color-blue)" label="Быстрый круг" value={fastestLap?.driverName?.split(" ").slice(-1)[0] || "—"} sub={fastestLap?.fastestLap?.time} />
                <StatCard icon={Wrench} color="var(--color-teal)" label="Лучший пит" value={fastestStop ? `${fastestStop.durationSec.toFixed(1)}с` : "—"} sub={fastestStop ? byId.get(fastestStop.driverId)?.driverName?.split(" ").slice(-1)[0] : undefined} />
                <StatCard icon={TrendingUp} color="var(--color-live)" label="Прорыв" value={mover ? `+${mover.gain}` : "—"} sub={mover ? `${mover.result.driverCode} (старт P${mover.result.grid})` : undefined} />
                <StatCard icon={Flag} color="var(--color-downvote)" label="Сходы" value={String(dnfCount)} sub={`из ${results.length} пилотов`} />
              </section>

              {/* Podium */}
              {podium.length === 3 && (
                <section className="grid grid-cols-3 gap-3">
                  {podium.map((r, i) => (
                    <div key={r.driverCode} className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3" style={{ borderTopColor: MEDAL[i], borderTopWidth: 3 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black" style={{ color: MEDAL[i] }}>{i + 1}</span>
                        <TeamLogo team={r.constructorName} size={20} />
                      </div>
                      <div className="mt-1 font-semibold leading-tight" style={{ color: driverColor(r) }}>{r.driverCode}</div>
                      <div className="truncate text-xs text-[--text-secondary]">{r.driverName}</div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[--text-muted]">
                        <span>{r.constructorName}</span>
                        <span className="font-mono font-semibold text-[--text-secondary]">{r.points || 0} оч.</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Race results + Qualifying */}
              <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
                <SectionCard icon={Trophy} iconColor="var(--color-gold)" title="Результаты гонки">
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-[2rem_1fr_5rem_3.5rem] gap-2 border-b border-[--border-default] bg-[--bg-elevated]/40 px-3 py-2 text-[10px] font-semibold uppercase text-[--text-muted] md:grid-cols-[2.5rem_1fr_1fr_3rem_3rem_6rem_3rem] md:px-4">
                      <span>#</span><span>Пилот</span>
                      <span className="hidden md:block">Команда</span>
                      <span className="hidden md:block">Старт</span>
                      <span className="hidden md:block">±</span>
                      <span>Время</span><span>Очки</span>
                    </div>
                    {results.map((r) => (
                      <div key={r.driverCode} className="grid grid-cols-[2rem_1fr_5rem_3.5rem] items-center gap-2 border-b border-[--border-default] px-3 py-2 text-sm last:border-0 md:grid-cols-[2.5rem_1fr_1fr_3rem_3rem_6rem_3rem] md:px-4">
                        <span className="font-mono font-bold text-[--text-muted]">{r.position}</span>
                        <Link href={`/drivers/${r.driverCode}`} className="flex items-center gap-1.5 truncate font-medium hover:underline">
                          <span style={{ color: driverColor(r) }} className="font-mono text-xs">{r.driverCode}</span>
                          <span className="truncate text-[--text-secondary]">{r.driverName.split(" ").slice(-1)[0]}</span>
                          {r.fastestLap?.rank === "1" && <Zap className="h-3 w-3 shrink-0 text-[--purple]" />}
                        </Link>
                        <Link href={`/teams/${teamSlug(r.constructorName)}`} className="hidden items-center gap-1.5 truncate text-[--text-secondary] hover:underline md:flex">
                          <TeamLogo team={r.constructorName} size={14} />
                          <span className="truncate text-xs">{r.constructorName}</span>
                        </Link>
                        <span className="hidden font-mono text-xs text-[--text-muted] md:block">{r.grid && r.grid !== "0" ? `P${r.grid}` : "—"}</span>
                        <span className="hidden text-xs md:block"><PosDelta grid={r.grid} position={r.position} /></span>
                        <span className="truncate font-mono text-[11px]">{r.time || r.status || "—"}</span>
                        <span className="font-mono text-xs font-semibold">{r.points && r.points !== "0" ? r.points : "—"}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={Timer} iconColor="var(--color-primary)" title="Квалификация">
                  <div className="p-2">
                    {qualifying.length ? qualifying.map((q) => (
                      <div key={q.driverCode} className="grid grid-cols-[1.75rem_1fr_4rem] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[--bg-elevated]">
                        <span className="font-mono font-bold text-[--text-muted]">{q.position}</span>
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="font-mono" style={{ color: getF1TeamColor(q.constructorName) }}>{q.driverCode}</span>
                          <span className="truncate text-[--text-secondary]">{q.driverName.split(" ").slice(-1)[0]}</span>
                        </span>
                        <span className="text-right font-mono text-[--primary]">{q.q3 || q.q2 || q.q1 || "—"}</span>
                      </div>
                    )) : (
                      <div className="p-6 text-center text-sm text-[--text-muted]">Данные квалификации недоступны.</div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Sprint */}
              {sprint.length > 0 && (
                <SectionCard icon={Zap} iconColor="var(--color-purple)" title="Спринт">
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-[2rem_1fr_5rem_3.5rem] gap-2 border-b border-[--border-default] bg-[--bg-elevated]/40 px-3 py-2 text-[10px] font-semibold uppercase text-[--text-muted] md:grid-cols-[2.5rem_1fr_1fr_6rem_3rem] md:px-4">
                      <span>#</span><span>Пилот</span>
                      <span className="hidden md:block">Команда</span>
                      <span>Время/статус</span><span>Очки</span>
                    </div>
                    {sprint.map((r) => (
                      <div key={r.driverCode} className="grid grid-cols-[2rem_1fr_5rem_3.5rem] items-center gap-2 border-b border-[--border-default] px-3 py-2 text-sm last:border-0 md:grid-cols-[2.5rem_1fr_1fr_6rem_3rem] md:px-4">
                        <span className="font-mono font-bold text-[--text-muted]">{r.position}</span>
                        <span className="flex items-center gap-1.5 truncate font-medium">
                          <span style={{ color: driverColor(r) }} className="font-mono text-xs">{r.driverCode}</span>
                          <span className="truncate text-[--text-secondary]">{r.driverName.split(" ").slice(-1)[0]}</span>
                        </span>
                        <span className="hidden items-center gap-1.5 truncate text-[--text-secondary] md:flex">
                          <TeamLogo team={r.constructorName} size={14} /><span className="truncate text-xs">{r.constructorName}</span>
                        </span>
                        <span className="truncate font-mono text-[11px]">{r.time || r.status || "—"}</span>
                        <span className="font-mono text-xs font-semibold">{r.points && r.points !== "0" ? r.points : "—"}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Pit stops + Fastest laps */}
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard icon={Wrench} iconColor="var(--color-teal)" title="Пит-стопы">
                  {stopsByDriver.length ? (
                    <div className="p-2">
                      <div className="grid grid-cols-[1fr_4rem_4rem] gap-2 px-2 py-1 text-[10px] font-semibold uppercase text-[--text-muted]">
                        <span>Пилот</span><span className="text-right">Стопов</span><span className="text-right">Лучший</span>
                      </div>
                      {stopsByDriver.map((d) => (
                        <div key={d.id} className="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[--bg-elevated]">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="font-mono" style={{ color: driverColor(d.result) }}>{d.result.driverCode}</span>
                            <span className="truncate text-[--text-secondary]">{d.result.driverName.split(" ").slice(-1)[0]}</span>
                          </span>
                          <span className="text-right font-mono text-[--text-muted]">{d.count}</span>
                          <span className={`text-right font-mono ${fastestStop && d.best === fastestStop.durationSec ? "font-bold text-[--teal]" : ""}`}>
                            {d.best != null ? `${d.best.toFixed(1)}с` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-[--text-muted]">Данные пит-стопов недоступны для этого этапа.</div>
                  )}
                </SectionCard>

                <SectionCard icon={Clock} iconColor="var(--color-blue)" title="Быстрейшие круги">
                  {fastestLaps.length ? (
                    <div className="p-2">
                      {fastestLaps.map((r, i) => (
                        <div key={r.driverCode} className="grid grid-cols-[1.75rem_1fr_5rem] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[--bg-elevated]">
                          <span className="font-mono font-bold text-[--text-muted]">{i + 1}</span>
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="font-mono" style={{ color: driverColor(r) }}>{r.driverCode}</span>
                            <span className="truncate text-[--text-secondary]">{r.driverName.split(" ").slice(-1)[0]}</span>
                            {i === 0 && <Zap className="h-3 w-3 shrink-0 text-[--purple]" />}
                          </span>
                          <span className={`text-right font-mono ${i === 0 ? "font-bold text-[--purple]" : "text-[--text-secondary]"}`}>{r.fastestLap?.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-[--text-muted]">Данные кругов недоступны.</div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
