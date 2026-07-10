import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TeamLogo } from "@/components/ui/team-logo"
import { FormSparkline } from "@/components/stats/form-sparkline"
import { Medal, Check, Circle, Trophy } from "lucide-react"

function PosCell({ pos }: { pos: number }) {
  if (pos === 1) return <Medal className="w-3.5 h-3.5 text-[--gold]" />
  if (pos === 2) return <Medal className="w-3.5 h-3.5 text-zinc-400" />
  if (pos === 3) return <Medal className="w-3.5 h-3.5 text-amber-600" />
  return <>{pos}</>
}

interface DriverStanding {
  pos: number; driver: string; surname: string; team: string; color: string; pts: number
  form?: number[]; wins?: number
}

export function DriverStandingsTable({ drivers, onDriverClick }: {
  drivers: DriverStanding[]
  onDriverClick?: (code: string) => void
}) {
  const hasForm = drivers.some((d) => d.form && d.form.length > 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Гонщик</TableHead>
          <TableHead>Команда</TableHead>
          <TableHead className="text-right w-16">Очки</TableHead>
          {hasForm && <TableHead className="w-24">Форма</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {drivers.map((d) => (
          <TableRow
            key={d.driver}
            className="cursor-pointer"
            onClick={() => onDriverClick?.(d.driver)}
          >
            <TableCell className="font-mono font-bold text-[--muted-foreground] text-xs">
              <PosCell pos={d.pos} />
            </TableCell>
            <TableCell className="font-medium">
              <span style={{ color: d.color }}>{d.driver}</span>
              <span className="text-[--muted-foreground] text-xs ml-1">{d.surname}</span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <TeamLogo team={d.team} size={14} />
                <span className="text-[--muted-foreground] text-xs">{d.team}</span>
              </div>
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{d.pts}</TableCell>
            {hasForm && (
              <TableCell>
                <FormSparkline form={d.form || []} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface ConstructorStanding {
  pos: number; team: string; color: string; pts: number; wins?: number
}

export function ConstructorStandingsTable({ constructors, onTeamClick }: {
  constructors: ConstructorStanding[]
  onTeamClick?: (team: string) => void
}) {
  const hasWins = constructors.some((c) => c.wins != null)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Команда</TableHead>
          <TableHead className="text-right w-16">Очки</TableHead>
          {hasWins && <TableHead className="text-right w-16">Победы</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {constructors.map((c) => (
          <TableRow
            key={c.team}
            className="cursor-pointer"
            onClick={() => onTeamClick?.(c.team)}
          >
            <TableCell className="font-mono font-bold text-[--muted-foreground] text-xs">
              <PosCell pos={c.pos} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <TeamLogo team={c.team} size={16} />
                <span className="font-medium">{c.team}</span>
              </div>
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{c.pts}</TableCell>
            {hasWins && (
              <TableCell className="text-right tabular-nums">
                {c.wins ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    <Trophy className="w-3 h-3 text-[--gold]" />{c.wins}
                  </span>
                ) : (
                  <span className="text-[--muted-foreground] text-xs">—</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface Race {
  round: string; name: string; circuit: string; country: string; date: string
}

export function RaceCalendar({ races, currentRound, onRaceClick }: {
  races: Race[]
  currentRound?: number
  onRaceClick?: (round: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 max-h-[550px] overflow-y-auto pr-1 custom-scroll">
      {races.map((r) => {
        const rn = parseInt(r.round)
        const raceDate = new Date(r.date + "T23:59:59Z")
        const raceDay = new Date(r.date + "T12:00:00Z")
        const now = new Date()
        const isPast = raceDate < now
        const isToday = raceDay.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
        const isCurrentRound = currentRound === rn
        const isNext = !isPast && !isToday
        return (
          <div
            key={r.round}
            onClick={() => onRaceClick?.(rn)}
            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors text-xs ${
              isToday || isCurrentRound
                ? "bg-[--live]/10 border border-[--live]/30"
                : isNext
                  ? "hover:bg-[--bg-elevated]"
                  : "hover:bg-[--bg-elevated] text-[--muted-foreground]"
            }`}
          >
            <span className={`font-mono font-bold w-8 text-center ${
              isToday || isCurrentRound ? "text-[--live]" : isNext ? "text-[--primary]" : "text-[--muted-foreground]"
            }`}>
              R{r.round}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-[--muted-foreground] text-[10px]">{r.circuit}, {r.country}</div>
            </div>
            <div className="text-[--muted-foreground] text-[10px] shrink-0">
              {new Date(r.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </div>
            {isToday && <Badge variant="default" className="text-[10px] gap-1"><Circle className="w-2 h-2 fill-current animate-pulse" /> LIVE</Badge>}
            {isPast && !isToday && <Check className="w-3.5 h-3.5 text-green-400" />}
          </div>
        )
      })}
    </div>
  )
}
