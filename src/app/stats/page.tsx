"use client"

import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DriverStandingsTable, ConstructorStandingsTable, RaceCalendar } from "@/components/stats/standings-tables"
import { RaceDrawer, DriverDrawer, TeamDrawer } from "@/components/stats/drawers"
import { ChampionshipChart } from "@/components/stats/championship-chart"
import { RecordsPanel, type SeasonRecords } from "@/components/stats/records-panel"
import { HeadToHead } from "@/components/stats/head-to-head"
import { StatsSkeleton } from "@/components/stats/stats-skeleton"
import { Trophy, Flag, TrendingUp, Timer, MapPin, Calendar, Circle, Zap, ChevronRight, Medal, Siren, Users, BarChart3, Award } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

interface DriverRow {
  code: string; name: string; team: string; color: string
  pts: number; wins: number; points: number[]; form: number[]
}
interface ConstructorRow {
  team: string; color: string; pts: number; wins: number; points: number[]
}
interface CalendarRace {
  round: number; name: string; circuit: string; country: string; date: string
}
interface TimelineData {
  season: number; round: number; totalRaces: number
  calendar: CalendarRace[]; rounds: string[]
  drivers: DriverRow[]; constructors: ConstructorRow[]; records: SeasonRecords
}

interface RaceResultRow { position: string; driverName: string; time?: string; status: string }
interface DashboardData {
  nextRace: { name: string; circuit: string; country: string; date: string; round: number } | null
  lastRace: { raceName: string; round: string; date?: string; circuit?: string; results?: RaceResultRow[] } | null
}

type SelectedDriver = { code: string; name?: string; team: string; pts: number; pos: number; color: string }
type SelectedTeam = { name: string; pts: number; pos: number; color: string }
type SelectedRace = { raceName: string; circuit: string; country: string; date: string; round: number; season: number }

const CURRENT_YEAR = new Date().getFullYear()
const SEASONS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i)

export default function StatsPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [data, setData] = useState<TimelineData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedRace, setSelectedRace] = useState<SelectedRace | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<SelectedDriver | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam | null>(null)
  const [lastRaceExpanded, setLastRaceExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError("")
    fetch(`/api/stats/timeline?year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [year])

  // Next race + detailed last-race results only exist for the live season.
  useEffect(() => {
    if (year !== CURRENT_YEAR) { setDashboard(null); return }
    fetch("/api/stats/dashboard")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDashboard(d) })
      .catch(() => {})
  }, [year])

  const isLive = year === CURRENT_YEAR

  const seasonSelect = (
    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
      <SelectTrigger size="sm" className="w-[150px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SEASONS.map((y) => (
          <SelectItem key={y} value={String(y)}>Сезон {y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const pageHeader = (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-[--primary]" />
          Статистика {year}
        </h1>
        {data && (
          <p className="text-[13px] text-[--muted-foreground] mt-1">
            {data.round} из {data.totalRaces} гонок завершено
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {seasonSelect}
        <Link
          href="/stats/timing"
          className="flex items-center gap-1.5 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-1.5 text-sm font-medium text-[--text-secondary] transition-colors hover:text-[--text-primary]"
        >
          <Timer className="w-4 h-4" />
          <span className="hidden sm:inline">Тайминги</span>
        </Link>
        <Badge variant="secondary" className="gap-1 hidden sm:flex">
          <Circle className="w-2 h-2 fill-green-400 text-green-400" />
          Jolpica API
        </Badge>
      </div>
    </div>
  )

  if (loading && !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-6 min-w-0">
          <div className="max-w-[1200px] mx-auto px-4">{pageHeader}<StatsSkeleton /></div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center text-[--text-muted]">{error || "Нет данных"}</div>
      </div>
    )
  }

  const driverStandings = data.drivers.map((d, i) => ({
    pos: i + 1,
    driver: d.code,
    surname: d.name.split(" ").slice(1).join(" ") || d.name,
    team: d.team,
    color: d.color,
    pts: d.pts,
    wins: d.wins,
    form: d.form,
  }))

  const constructorStandings = data.constructors.map((c, i) => ({
    pos: i + 1,
    team: c.team,
    color: c.color,
    pts: c.pts,
    wins: c.wins,
  }))

  const driverChartSeries = data.drivers.map((d) => ({ key: d.code, label: d.code, color: d.color, points: d.points }))
  const teamChartSeries = data.constructors.map((c) => ({ key: c.team, label: c.team, color: c.color, points: c.points }))

  const openDriver = (code: string) => {
    const d = data.drivers.find((x) => x.code === code)
    if (d) setSelectedDriver({ code: d.code, name: d.name, team: d.team, pts: d.pts, pos: data.drivers.indexOf(d) + 1, color: d.color })
  }
  const openTeam = (team: string) => {
    const c = data.constructors.find((x) => x.team === team)
    if (c) setSelectedTeam({ name: c.team, pts: c.pts, pos: data.constructors.indexOf(c) + 1, color: c.color })
  }
  const openRace = (round: number) => {
    const r = data.calendar.find((x) => x.round === round)
    if (r) setSelectedRace({ raceName: r.name, circuit: r.circuit, country: r.country, date: r.date, round, season: year })
  }

  const calendarForList = data.calendar.map((r) => ({
    round: String(r.round), name: r.name, circuit: r.circuit, country: r.country, date: r.date,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-6 min-w-0">
        <div className="max-w-[1200px] mx-auto px-4">
          {pageHeader}

          <Tabs defaultValue="overview">
            <div className="overflow-x-auto">
              <TabsList className="mb-5">
              <TabsTrigger value="overview"><BarChart3 />Обзор</TabsTrigger>
              <TabsTrigger value="drivers"><Users />Гонщики</TabsTrigger>
              <TabsTrigger value="teams"><Trophy />Команды</TabsTrigger>
              <TabsTrigger value="records"><Award />Рекорды</TabsTrigger>
            </TabsList>
            </div>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {isLive && dashboard?.nextRace ? (
                  <Card className="p-4 lg:col-span-2 border-l-[3px] border-l-[--primary]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[--primary]/10 text-[--primary] gap-1 text-[10px]">
                            <Flag className="w-3 h-3" />R{dashboard.nextRace.round}
                          </Badge>
                          <h2 className="text-base font-semibold">{dashboard.nextRace.name}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[--muted-foreground]">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dashboard.nextRace.circuit}, {dashboard.nextRace.country}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(dashboard.nextRace.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                        </div>
                      </div>
                      <Zap className="w-8 h-8 text-[--primary]/20 shrink-0" />
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4 lg:col-span-2 flex items-center gap-2 text-sm text-[--muted-foreground]">
                    <Trophy className="w-4 h-4 text-[--gold]" />
                    Чемпион сезона {year}: <span className="font-semibold text-[--foreground]">{data.drivers[0]?.name || "—"}</span>
                  </Card>
                )}
                <Card className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[--muted-foreground] mb-2">Прогресс сезона</div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-2xl font-bold tabular-nums">{data.round}</span>
                    <span className="text-sm text-[--muted-foreground]">/ {data.totalRaces}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[--bg-elevated] overflow-hidden">
                    <div className="h-full rounded-full bg-[--primary] transition-all" style={{ width: `${data.totalRaces ? (data.round / data.totalRaces) * 100 : 0}%` }} />
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[--primary]" />
                  <h2 className="text-sm font-semibold">Борьба за чемпионство</h2>
                </div>
                <ChampionshipChart rounds={data.rounds} series={driverChartSeries} defaultTopN={6} />
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-[--blue]" />
                    <h2 className="text-sm font-semibold">Календарь гонок</h2>
                  </div>
                  <RaceCalendar races={calendarForList} currentRound={isLive ? data.round + 1 : undefined} onRaceClick={openRace} />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-[--purple]" />
                    <h2 className="text-sm font-semibold">Последняя гонка</h2>
                  </div>
                  {isLive && dashboard?.lastRace ? (
                    <div>
                      <div
                        className="flex items-center justify-between p-2 rounded-md hover:bg-[--bg-elevated] cursor-pointer transition-colors"
                        onClick={() => openRace(parseInt(dashboard.lastRace!.round))}
                      >
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">R{dashboard.lastRace.round}</Badge>
                            {dashboard.lastRace.raceName}
                          </div>
                          {dashboard.lastRace.results?.[0] && (
                            <div className="text-[11px] text-[--muted-foreground] mt-0.5">
                              Победитель: <span className="text-[--foreground] font-medium">{dashboard.lastRace.results[0].driverName}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[--muted-foreground]" />
                      </div>
                      {dashboard.lastRace.results?.slice(0, lastRaceExpanded ? undefined : 10).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                          <span className="font-mono font-bold text-[--muted-foreground] w-5">{r.position}</span>
                          <span className="font-medium flex-1">{r.driverName}</span>
                          <span className="text-[--muted-foreground] font-mono">{r.time || r.status}</span>
                        </div>
                      ))}
                      {(dashboard.lastRace.results?.length || 0) > 10 && (
                        <button onClick={() => setLastRaceExpanded(!lastRaceExpanded)} className="text-[11px] text-[--primary] hover:underline mt-1">
                          {lastRaceExpanded ? "Свернуть" : `Показать все (${dashboard.lastRace.results!.length})`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-[--muted-foreground] text-sm py-8">
                      <Siren className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {isLive ? "Сезон ещё не начался" : "Откройте гонку в календаре, чтобы увидеть результаты"}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* DRIVERS */}
            <TabsContent value="drivers" className="flex flex-col gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-[--gold]" />
                  <h2 className="text-sm font-semibold">Личный зачёт</h2>
                </div>
                <DriverStandingsTable drivers={driverStandings} onDriverClick={openDriver} />
              </Card>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[--teal]" />
                  <h2 className="text-sm font-semibold">Сравнение пилотов</h2>
                </div>
                <HeadToHead drivers={data.drivers} rounds={data.rounds} />
              </div>
            </TabsContent>

            {/* TEAMS */}
            <TabsContent value="teams" className="flex flex-col gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Medal className="w-4 h-4 text-[--teal]" />
                  <h2 className="text-sm font-semibold">Кубок конструкторов</h2>
                </div>
                <ConstructorStandingsTable constructors={constructorStandings} onTeamClick={openTeam} />
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[--primary]" />
                  <h2 className="text-sm font-semibold">Очки конструкторов по этапам</h2>
                </div>
                <ChampionshipChart rounds={data.rounds} series={teamChartSeries} defaultTopN={5} />
              </Card>
            </TabsContent>

            {/* RECORDS */}
            <TabsContent value="records">
              <RecordsPanel records={data.records} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <RaceDrawer open={!!selectedRace} onClose={() => setSelectedRace(null)} race={selectedRace} />
      <DriverDrawer open={!!selectedDriver} onClose={() => setSelectedDriver(null)} driver={selectedDriver} />
      <TeamDrawer open={!!selectedTeam} onClose={() => setSelectedTeam(null)} team={selectedTeam} />
    </div>
  )
}
