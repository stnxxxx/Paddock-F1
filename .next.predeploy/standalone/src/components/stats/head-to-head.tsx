"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamLogo } from "@/components/ui/team-logo"
import { ChampionshipChart } from "@/components/stats/championship-chart"
import { FormSparkline } from "@/components/stats/form-sparkline"

export interface DriverSeries {
  code: string
  name: string
  team: string
  color: string
  pts: number
  wins: number
  points: number[]
  form: number[]
}

function StatRow({ label, a, b, betterIsHigher = true, render }: {
  label: string
  a: number
  b: number
  betterIsHigher?: boolean
  render?: (v: number) => React.ReactNode
}) {
  const aWins = a === b ? null : betterIsHigher ? a > b : a < b
  const cls = (win: boolean | null) =>
    win === null ? "text-[--text-secondary]" : win ? "text-[--text-primary] font-bold" : "text-[--text-muted]"
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-[--border-default] last:border-0">
      <div className={`text-right tabular-nums ${cls(aWins)}`}>{render ? render(a) : a}</div>
      <div className="text-[10px] uppercase tracking-wider text-[--text-muted] text-center min-w-16 sm:min-w-20">{label}</div>
      <div className={`text-left tabular-nums ${cls(aWins === null ? null : !aWins)}`}>{render ? render(b) : b}</div>
    </div>
  )
}

export function HeadToHead({ drivers, rounds }: { drivers: DriverSeries[]; rounds: string[] }) {
  const [aCode, setACode] = useState(drivers[0]?.code || "")
  const [bCode, setBCode] = useState(drivers[1]?.code || "")

  const a = drivers.find((d) => d.code === aCode)
  const b = drivers.find((d) => d.code === bCode)

  if (drivers.length < 2 || !a || !b) {
    return <div className="text-sm text-[--text-muted] py-6 text-center">Недостаточно данных для сравнения</div>
  }

  const posA = drivers.indexOf(a) + 1
  const posB = drivers.indexOf(b) + 1

  const picker = (value: string, onChange: (v: string) => void, exclude: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {drivers.filter((d) => d.code !== exclude).map((d) => (
          <SelectItem key={d.code} value={d.code}>
            <span className="font-mono font-bold" style={{ color: d.color }}>{d.code}</span>
            <span className="text-[--text-muted] ml-1">{d.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 mb-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-3 sm:items-center">
        {picker(aCode, setACode, bCode)}
        <span className="text-center text-xs font-bold text-[--text-muted] sm:text-left">VS</span>
        {picker(bCode, setBCode, aCode)}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
        {[a, b].map((d) => (
          <div key={d.code} className="rounded-lg border-l-[3px] p-3 bg-[--bg-elevated]" style={{ borderColor: d.color }}>
            <div className="font-mono text-lg font-bold" style={{ color: d.color }}>{d.code}</div>
            <div className="text-xs text-[--text-secondary] truncate">{d.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <TeamLogo team={d.team} size={12} />
              <span className="text-[11px] text-[--text-muted] truncate">{d.team}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <StatRow label="Позиция" a={posA} b={posB} betterIsHigher={false} render={(v) => `P${v}`} />
        <StatRow label="Очки" a={a.pts} b={b.pts} />
        <StatRow label="Победы" a={a.wins} b={b.wins} />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
          <div className="flex justify-end"><FormSparkline form={a.form} /></div>
          <div className="text-[10px] uppercase tracking-wider text-[--text-muted] text-center min-w-16 sm:min-w-20">Форма</div>
          <div className="flex justify-start"><FormSparkline form={b.form} /></div>
        </div>
      </div>

      <ChampionshipChart
        rounds={rounds}
        series={[
          { key: a.code, label: a.code, color: a.color, points: a.points },
          { key: b.code, label: b.code, color: b.color, points: b.points },
        ]}
        defaultTopN={2}
      />
    </Card>
  )
}
