import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { StatCard } from "@/components/profile/panels"
import { TeamLogo } from "@/components/ui/team-logo"
import { ALL_DRIVERS, getJolpicaDriverId } from "@/lib/drivers"
import { fetchAllStandings, fetchDriverResults } from "@/lib/f1-data"
import { getF1TeamColor } from "@/lib/f1/normalizer"
import { ChevronLeft, Flag, Trophy, Zap } from "lucide-react"

interface DriverPageProps {
  params: Promise<{ id: string }>
}

function codeFromParam(id: string) {
  return decodeURIComponent(id).trim().toUpperCase()
}

export async function generateMetadata({ params }: DriverPageProps): Promise<Metadata> {
  const { id } = await params
  const code = codeFromParam(id)
  const known = ALL_DRIVERS.find((driver) => driver.code === code)
  const name = known?.name || code

  return {
    title: `${name} — профиль пилота F1`,
    description: `Статистика, результаты сезона и обсуждения пилота ${name} на PADDOCK.`,
    alternates: { canonical: `/drivers/${code}` },
    openGraph: {
      title: `${name} — профиль пилота F1`,
      description: `Результаты, команда, очки и форма пилота ${name}.`,
      images: ["/paddock-og.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — профиль пилота F1`,
      images: ["/paddock-og.svg"],
    },
  }
}

export default async function DriverPage({ params }: DriverPageProps) {
  const { id } = await params
  const code = codeFromParam(id)
  const known = ALL_DRIVERS.find((driver) => driver.code === code)
  const season = new Date().getFullYear()

  const [standings, results] = await Promise.all([
    fetchAllStandings().catch(() => null),
    fetchDriverResults(getJolpicaDriverId(code), season).catch(() => null),
  ])

  const standing = standings?.drivers.find((driver) => driver.driver === code)
  const races = results?.races || []
  const totalPoints = races.reduce((sum, race) => sum + Number(race.points || 0), 0)
  const podiums = races.filter((race) => Number(race.position) >= 1 && Number(race.position) <= 3).length
  const team = standing?.team || known?.team || races[races.length - 1]?.constructorName
  const teamColor = team ? getF1TeamColor(team) : "var(--color-accent)"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="mx-auto w-full max-w-[980px] px-4">
          <Link href="/stats" className="mb-4 inline-flex items-center gap-1 text-xs text-[--text-muted] hover:text-[--text-primary]">
            <ChevronLeft className="h-3.5 w-3.5" />
            Статистика сезона
          </Link>

          <section className="mb-5 rounded-xl border border-[--border-default] bg-[--bg-surface] p-5" style={{ borderLeftColor: teamColor, borderLeftWidth: 3 }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg px-2.5 py-1 font-mono text-sm font-black" style={{ backgroundColor: `color-mix(in srgb, ${teamColor} 16%, transparent)`, color: teamColor }}>{code}</span>
                  <span className="text-xs text-[--text-muted]">F1 {season}</span>
                </div>
                <h1 className="text-3xl font-bold text-[--text-primary]">{known?.name || code}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[--text-muted]">
                  {team && <span className="flex items-center gap-1.5"><TeamLogo team={team} size={16} />{team}</span>}
                  {standing && <span>Позиция: P{standing.pos}</span>}
                  {standing && <span>{standing.pts} очков</span>}
                </p>
              </div>
              <Link href={`/?q=${encodeURIComponent(code)}`} className="inline-flex h-9 items-center gap-2 rounded-md bg-[--accent] px-3 text-xs font-semibold text-white hover:bg-[--accent-hover]">
                <Flag className="h-4 w-4" />
                Обсуждения
              </Link>
            </div>
          </section>

          <section className="mb-5 grid gap-3 md:grid-cols-3">
            <StatCard icon={<Trophy className="h-4 w-4 text-[--gold]" />} label="Очки сезона" value={standing?.pts ?? totalPoints} />
            <StatCard icon={<Zap className="h-4 w-4 text-[--accent]" />} label="Подиумы" value={podiums} />
            <StatCard icon={<Flag className="h-4 w-4 text-[--primary]" />} label="Гонок с результатом" value={races.length} />
          </section>

          <section className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
            <div className="border-b border-[--border-default] px-4 py-3">
              <h2 className="text-sm font-semibold">Результаты сезона</h2>
            </div>
            {races.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="grid min-w-[720px] grid-cols-[3rem_1fr_1fr_5rem_5rem_6rem] gap-2 border-b border-[--border-default] bg-[--bg-elevated]/50 px-4 py-2 text-[10px] font-semibold uppercase text-[--text-muted]">
                  <span>R</span><span>Гонка</span><span>Команда</span><span>Старт</span><span>Финиш</span><span>Очки</span>
                </div>
                {races.map((race) => (
                  <Link key={race.round} href={`/race/${season}/${race.round}`} className="grid min-w-[720px] grid-cols-[3rem_1fr_1fr_5rem_5rem_6rem] items-center gap-2 border-b border-[--border-default] px-4 py-2.5 text-sm last:border-0 hover:bg-[--bg-elevated]">
                    <span className="font-mono text-xs text-[--text-muted]">{race.round}</span>
                    <span className="font-medium">{race.raceName}</span>
                    <span className="flex items-center gap-2 text-[--text-secondary]"><TeamLogo team={race.constructorName} size={14} />{race.constructorName}</span>
                    <span className="font-mono text-xs">{race.grid || "-"}</span>
                    <span className="font-mono text-xs font-semibold">{race.position}</span>
                    <span className="font-mono text-xs">{race.points || "0"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[--text-muted]">Данные по пилоту пока недоступны.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
