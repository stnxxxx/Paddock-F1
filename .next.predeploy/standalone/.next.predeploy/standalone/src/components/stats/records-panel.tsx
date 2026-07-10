"use client"

import { Card } from "@/components/ui/card"
import { TeamLogo } from "@/components/ui/team-logo"
import { Trophy, Medal, Timer, Flag, Siren, Target, type LucideIcon } from "lucide-react"

export interface RecordEntry {
  code: string
  name: string
  team: string
  color: string
  value: number
}

export interface SeasonRecords {
  wins: RecordEntry[]
  podiums: RecordEntry[]
  poles: RecordEntry[]
  fastestLaps: RecordEntry[]
  dnfs: RecordEntry[]
  avgFinish: RecordEntry[]
}

function RecordCard({ title, icon: Icon, iconColor, entries, lowerBetter = false, unit }: {
  title: string
  icon: LucideIcon
  iconColor: string
  entries: RecordEntry[]
  lowerBetter?: boolean
  unit?: string
}) {
  const best = entries[0]?.value || 1
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="text-xs text-[--text-muted] py-3 text-center">Нет данных</div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e, i) => {
            const width = lowerBetter
              ? Math.round((best / e.value) * 100)
              : Math.round((e.value / best) * 100)
            return (
              <div key={e.code} className="flex items-center gap-2">
                <span className="w-4 text-[11px] font-mono text-[--text-muted] tabular-nums">{i + 1}</span>
                <span className="font-mono text-xs font-bold w-9" style={{ color: e.color }}>{e.code}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <TeamLogo team={e.team} size={11} />
                    <span className="text-[11px] text-[--text-muted] truncate">{e.team}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-[--bg-elevated] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: e.color }} />
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums w-10 text-right">
                  {e.value}{unit ? <span className="text-[--text-muted] font-normal">{unit}</span> : ""}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export function RecordsPanel({ records }: { records: SeasonRecords }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <RecordCard title="Победы" icon={Trophy} iconColor="var(--color-gold)" entries={records.wins} />
      <RecordCard title="Подиумы" icon={Medal} iconColor="var(--color-teal)" entries={records.podiums} />
      <RecordCard title="Поулы" icon={Flag} iconColor="var(--color-purple)" entries={records.poles} />
      <RecordCard title="Быстрейшие круги" icon={Timer} iconColor="var(--color-blue)" entries={records.fastestLaps} />
      <RecordCard title="Сходы (DNF)" icon={Siren} iconColor="var(--color-destructive)" entries={records.dnfs} />
      <RecordCard title="Средний финиш" icon={Target} iconColor="var(--color-live)" entries={records.avgFinish} lowerBetter />
    </div>
  )
}
