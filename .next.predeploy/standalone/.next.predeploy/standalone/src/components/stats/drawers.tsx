"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose,
} from "@/components/ui/drawer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TeamLogo } from "@/components/ui/team-logo"
import { teamSlug } from "@/lib/utils"
import { X, MapPin, Clock } from "lucide-react"

interface RaceResult {
  position: string; driverCode: string; driverName: string
  constructorName: string; laps: string; status: string; time?: string; grid?: string; points?: string; fastestLap?: { rank: string; time: string } | null
}

interface QualifyingResult {
  position: string; driverCode: string; driverName: string
  constructorName: string; q1?: string; q2?: string; q3?: string
}

interface DriverRace {
  round: number; raceName: string; circuit: string; date: string
  position: string; grid: string; points: string; status: string; constructorName: string
}

interface ConstructorRace {
  round: number; raceName: string; circuit: string; date: string
  results: { position: string; driverCode: string; driverName: string; points: string; status: string }[]
}

export function RaceDrawer({
  open, onClose, race,
}: {
  open: boolean; onClose: () => void
  race: { raceName: string; circuit: string; country: string; date: string; round: number; season: number } | null
}) {
  const [results, setResults] = useState<RaceResult[] | null>(null)
  const [qualifying, setQualifying] = useState<QualifyingResult[] | null>(null)
  const [tab, setTab] = useState<"race" | "qual">("race")
  const [loading, setLoading] = useState(false)

  const season = race?.season
  const round = race?.round

  // Refetch whenever a different race is opened — the component stays mounted, so
  // without keying on season/round it would keep showing the first selection.
  useEffect(() => {
    if (!open || season == null || round == null) return
    let cancelled = false
    setResults(null)
    setQualifying(null)
    setTab("race")
    setLoading(true)
    Promise.all([
      fetch(`/api/stats/race/${season}/${round}/results`).then(r => r.json()).catch(() => null),
      fetch(`/api/stats/race/${season}/${round}/qualifying`).then(r => r.json()).catch(() => null),
    ])
      .then(([raceRes, qualRes]) => {
        if (cancelled) return
        setResults(raceRes?.results || [])
        setQualifying(qualRes?.results || [])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, season, round])

  if (!race) return null

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-start justify-between">
          <div>
            <DrawerTitle className="text-lg">{race.raceName}</DrawerTitle>
            <DrawerDescription className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{race.circuit}, {race.country}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(race.date).toLocaleDateString("ru-RU")}</span>
            </DrawerDescription>
            <Link href={`/race/${race.season}/${race.round}`} className="mt-2 inline-flex text-[11px] font-medium text-[--primary] hover:underline">
              Открыть страницу Гран-при
            </Link>
          </div>
          <DrawerClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[--bg-hover]">
              <X className="w-4 h-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <div className="flex gap-1 mb-3 bg-[--bg-elevated] rounded-lg p-1 w-fit">
            <button onClick={() => setTab("race")} className={`text-[11px] px-3 py-1 rounded font-medium transition-colors ${tab === "race" ? "bg-[--bg-surface] text-[--text-primary] shadow-sm" : "text-[--text-muted] hover:text-[--text-secondary]"}`}>Гонка</button>
            <button onClick={() => setTab("qual")} className={`text-[11px] px-3 py-1 rounded font-medium transition-colors ${tab === "qual" ? "bg-[--bg-surface] text-[--text-primary] shadow-sm" : "text-[--text-muted] hover:text-[--text-secondary]"}`}>Квалификация</button>
          </div>
          {loading ? (
            <div className="text-center text-[--text-muted] text-sm py-8">Загрузка...</div>
          ) : tab === "race" ? (
            results && results.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Гонщик</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead className="text-right">Время</TableHead>
                    <TableHead className="w-14">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.driverCode}>
                      <TableCell className="font-mono font-bold text-xs tabular-nums">{r.position}</TableCell>
                      <TableCell className="font-medium text-xs">{r.driverName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TeamLogo team={r.constructorName} size={12} />
                          <span className="text-[--muted-foreground] text-[11px]">{r.constructorName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.time || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "Finished" ? "secondary" : "outline"} className="text-[10px]">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <div className="text-center text-[--text-muted] text-sm py-8">Нет данных</div>
          ) : (
            qualifying && qualifying.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Гонщик</TableHead>
                    <TableHead>Q1</TableHead>
                    <TableHead>Q2</TableHead>
                    <TableHead>Q3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualifying.map((q) => (
                    <TableRow key={q.driverCode}>
                      <TableCell className="font-mono font-bold text-xs">{q.position}</TableCell>
                      <TableCell className="font-medium text-xs">{q.driverName}</TableCell>
                      <TableCell className="font-mono text-xs">{q.q1 || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{q.q2 || "-"}</TableCell>
                      <TableCell className="font-mono text-xs text-[--primary] font-semibold">{q.q3 || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <div className="text-center text-[--text-muted] text-sm py-8">Нет данных квалификации</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function DriverDrawer({
  open, onClose, driver,
}: {
  open: boolean; onClose: () => void
  driver: { code: string; name?: string; team: string; pts: number; pos: number; color: string } | null
}) {
  const [data, setData] = useState<{ races: DriverRace[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const code = driver?.code

  useEffect(() => {
    if (!open || !code) return
    let cancelled = false
    setData(null)
    setLoading(true)
    fetch(`/api/stats/driver/${code}`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setData(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, code])

  if (!driver) return null

  const races = data?.races || []
  const finished = races.filter((r: DriverRace) => r.position !== "R").length
  const podiums = races.filter((r: DriverRace) => parseInt(r.position) <= 3).length
  const totalPts = races.reduce((sum: number, r: DriverRace) => sum + parseFloat(r.points || "0"), 0)

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-start justify-between">
          <div>
            <DrawerTitle className="flex items-center gap-2">
              <span style={{ color: driver.color }} className="font-mono text-lg">{driver.code}</span>
              <span className="text-[--muted-foreground] text-sm font-normal">{driver.name || ""}</span>
            </DrawerTitle>
            <DrawerDescription className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1"><TeamLogo team={driver.team} size={14} />{driver.team}</span>
              <span className="text-[--muted-foreground]">·</span>
              <span className="font-semibold">{driver.pts} очков</span>
              <span className="text-[--muted-foreground]">· позиция {driver.pos}</span>
            </DrawerDescription>
            <Link href={`/drivers/${driver.code}`} className="mt-2 inline-flex text-[11px] font-medium text-[--primary] hover:underline">
              Открыть страницу пилота
            </Link>
          </div>
          <DrawerClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[--bg-hover]">
              <X className="w-4 h-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {loading ? (
            <div className="text-center text-[--text-muted] text-sm py-8">Загрузка...</div>
          ) : races.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-md bg-[--bg-elevated] p-2 text-center">
                  <div className="text-lg font-bold">{finished}</div>
                  <div className="text-[10px] text-[--muted-foreground]">Финишей</div>
                </div>
                <div className="rounded-md bg-[--bg-elevated] p-2 text-center">
                  <div className="text-lg font-bold text-[--gold]">{podiums}</div>
                  <div className="text-[10px] text-[--muted-foreground]">Подиумов</div>
                </div>
                <div className="rounded-md bg-[--bg-elevated] p-2 text-center">
                  <div className="text-lg font-bold">{totalPts}</div>
                  <div className="text-[10px] text-[--muted-foreground]">Очков</div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">R</TableHead>
                    <TableHead>Гонка</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead className="text-right w-10">#</TableHead>
                    <TableHead className="text-right w-10">Очки</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {races.map((r: DriverRace) => (
                    <TableRow key={r.round}>
                      <TableCell className="font-mono text-[10px] text-[--muted-foreground]">{r.round}</TableCell>
                      <TableCell className="text-xs font-medium">{r.raceName}</TableCell>
                      <TableCell className="text-[11px] text-[--muted-foreground]">{r.constructorName}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{r.position}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center text-[--text-muted] text-sm py-8">Нет данных за этот сезон</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function TeamDrawer({
  open, onClose, team,
}: {
  open: boolean; onClose: () => void
  team: { name: string; pts: number; pos: number; color: string } | null
}) {
  const [data, setData] = useState<{ races: ConstructorRace[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const teamName = team?.name

  useEffect(() => {
    if (!open || !teamName) return
    let cancelled = false
    setData(null)
    setLoading(true)
    fetch(`/api/stats/team/${teamName}`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setData(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, teamName])

  if (!team) return null

  const races = data?.races || []
  const totalPts = races.reduce((sum: number, r: ConstructorRace) => {
    return sum + r.results.reduce((s: number, rr) => s + parseFloat(rr.points || "0"), 0)
  }, 0)

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-start justify-between">
          <div>
            <DrawerTitle className="flex items-center gap-2">
              <TeamLogo team={team.name} size={22} />
              {team.name}
            </DrawerTitle>
            <DrawerDescription className="mt-1">
              {team.pts} очков · позиция {team.pos}{totalPts > 0 ? ` · исторические очки: ${totalPts}` : ""}
            </DrawerDescription>
            <Link href={`/teams/${teamSlug(team.name)}`} className="mt-2 inline-flex text-[11px] font-medium text-[--primary] hover:underline">
              Открыть страницу команды
            </Link>
          </div>
          <DrawerClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[--bg-hover]">
              <X className="w-4 h-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {loading ? (
            <div className="text-center text-[--text-muted] text-sm py-8">Загрузка...</div>
          ) : races.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">R</TableHead>
                  <TableHead>Гонка</TableHead>
                  <TableHead className="text-right w-16">Пилот 1</TableHead>
                  <TableHead className="text-right w-16">Пилот 2</TableHead>
                  <TableHead className="text-right w-10">Очки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {races.map((r: ConstructorRace) => {
                  const d1 = r.results[0]
                  const d2 = r.results[1]
                  const racePts = r.results.reduce((s: number, rr) => s + parseFloat(rr.points || "0"), 0)
                  return (
                    <TableRow key={r.round}>
                      <TableCell className="font-mono text-[10px] text-[--muted-foreground]">{r.round}</TableCell>
                      <TableCell className="text-xs font-medium">{r.raceName}</TableCell>
                      <TableCell className="text-right text-xs">
                        {d1 ? <><span className="font-mono font-bold">{d1.driverCode}</span> <span className="text-[--muted-foreground]">P{d1.position}</span></> : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {d2 ? <><span className="font-mono font-bold">{d2.driverCode}</span> <span className="text-[--muted-foreground]">P{d2.position}</span></> : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{racePts}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-[--text-muted] text-sm py-8">Нет данных за этот сезон</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
