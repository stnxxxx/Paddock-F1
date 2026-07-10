"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts"

export interface ChartSeries {
  key: string
  label: string
  color: string
  points: number[]
}

interface TooltipPayload {
  dataKey: string
  name?: string
  value: number
  color: string
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const rows = [...payload].sort((a, b) => b.value - a.value).slice(0, 12)
  return (
    <div className="min-w-[150px] rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1 text-[--text-primary]">{label}</div>
      <div className="flex flex-col gap-1">
        {rows.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-[--text-secondary]">{p.name || p.dataKey}</span>
            <span className="ml-auto pl-6 font-semibold tabular-nums text-[--text-primary]">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Cumulative championship progression. Each series carries its full per-round
 * points array; we pivot to per-round rows for recharts. The legend lets the
 * reader isolate or compare a subset of drivers/teams.
 */
export function ChampionshipChart({ rounds, series, defaultTopN = 6 }: {
  rounds: string[]
  series: ChartSeries[]
  defaultTopN?: number
}) {
  const [active, setActive] = useState<Set<string>>(
    () => new Set(series.slice(0, defaultTopN).map((s) => s.key))
  )

  // When the series themselves change (e.g. picking a different driver in the
  // head-to-head), reset the visible set to the top N so newly chosen lines
  // aren't left hidden. Keyed on the joined keys so manual toggles survive
  // ordinary re-renders.
  const seriesKeys = series.map((s) => s.key).join("|")
  useEffect(() => {
    setActive(new Set(series.slice(0, defaultTopN).map((s) => s.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKeys, defaultTopN])

  const rows = useMemo(
    () =>
      rounds.map((round, i) => {
        const row: Record<string, string | number> = { round }
        for (const s of series) row[s.key] = s.points[i] ?? 0
        return row
      }),
    [rounds, series]
  )

  const toggle = (key: string) =>
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (rounds.length < 2) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-[--text-muted]">
        Недостаточно гонок для графика
      </div>
    )
  }

  const shown = series.filter((s) => active.has(s.key))

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" vertical={false} />
            <XAxis dataKey="round" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }} />
            {shown.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {series.map((s) => {
          const on = active.has(s.key)
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                on
                  ? "border-[--border-strong] text-[--text-primary]"
                  : "border-[--border-default] text-[--text-muted] opacity-50 hover:opacity-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
