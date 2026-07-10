import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { StatCard } from "@/components/profile/panels"
import { TeamLogo } from "@/components/ui/team-logo"
import { fetchAllStandings, fetchConstructorResults } from "@/lib/f1-data"
import { getF1TeamColor } from "@/lib/f1/normalizer"
import { ChevronLeft, Flag, Medal, Trophy, Users } from "lucide-react"

interface TeamPageProps {
  params: Promise<{ id: string }>
}

const TEAM_ID_MAP: Record<string, string> = {
  "red-bull": "red_bull",
  ferrari: "ferrari",
  mclaren: "mclaren",
  mercedes: "mercedes",
  "aston-martin": "aston_martin",
  alpine: "alpine",
  williams: "williams",
  "racing-bulls": "rb",
  haas: "haas",
  audi: "audi",
  cadillac: "cadillac",
}

function teamNameFromParam(id: string) {
  return decodeURIComponent(id).replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function constructorIdFromParam(id: string) {
  const raw = decodeURIComponent(id).trim()
  const slug = raw.toLowerCase().replace(/\s+/g, "-")
  return TEAM_ID_MAP[slug] || raw.toLowerCase().replace(/\s+/g, "_")
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { id } = await params
  const team = teamNameFromParam(id)
  return {
    title: `${team} — профиль команды F1`,
    description: `Статистика, очки, результаты гонок и обсуждения команды ${team} на PADDOCK.`,
    alternates: { canonical: `/teams/${encodeURIComponent(id)}` },
    openGraph: {
      title: `${team} — профиль команды F1`,
      description: `Результаты сезона, пилоты и форма команды ${team}.`,
      images: ["/paddock-og.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${team} — профиль команды F1`,
      images: ["/paddock-og.svg"],
    },
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params
  const teamName = teamNameFromParam(id)
  const constructorId = constructorIdFromParam(id)
  const season = new Date().getFullYear()

  const [standings, results] = await Promise.all([
    fetchAllStandings().catch(() => null),
    fetchConstructorResults(constructorId, season).catch(() => null),
  ])

  const standing = standings?.constructors.find((team) => team.team.toLowerCase() === teamName.toLowerCase())
  const displayName = standing?.team || teamName
  const races = results?.races || []
  const totalPoints = races.reduce((sum, race) => sum + race.results.reduce((inner, result) => inner + Number(result.points || 0), 0), 0)
  const podiums = races.reduce((sum, race) => sum + race.results.filter((result) => Number(result.position) >= 1 && Number(result.position) <= 3).length, 0)
  const drivers = Array.from(new Set(races.flatMap((race) => race.results.map((result) => result.driverCode)).filter(Boolean)))
  const teamColor = getF1TeamColor(displayName)

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
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${teamColor} 16%, transparent)` }}>
                    <TeamLogo team={displayName} size={28} />
                  </span>
                  <span className="text-xs text-[--text-muted]">F1 {season}</span>
                </div>
                <h1 className="text-3xl font-bold text-[--text-primary]">{displayName}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[--text-muted]">
                  {standing && <span>Позиция: P{standing.pos}</span>}
                  {standing && <span>{standing.pts} очков</span>}
                  {drivers.length > 0 && <span>Пилоты: {drivers.join(", ")}</span>}
                </p>
              </div>
              <Link href={`/?q=${encodeURIComponent(displayName)}`} className="inline-flex h-9 items-center gap-2 rounded-md bg-[--accent] px-3 text-xs font-semibold text-white hover:bg-[--accent-hover]">
                <Flag className="h-4 w-4" />
                Обсуждения
              </Link>
            </div>
          </section>

          <section className="mb-5 grid gap-3 md:grid-cols-3">
            <StatCard icon={<Trophy className="h-4 w-4 text-[--gold]" />} label="Очки сезона" value={standing?.pts ?? totalPoints} />
            <StatCard icon={<Medal className="h-4 w-4 text-[--accent]" />} label="Подиумы пилотов" value={podiums} />
            <StatCard icon={<Users className="h-4 w-4 text-[--primary]" />} label="Пилоты в сезоне" value={drivers.length || "-"} />
          </section>

          <section className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
            <div className="border-b border-[--border-default] px-4 py-3">
              <h2 className="text-sm font-semibold">Результаты команды</h2>
            </div>
            {races.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-[3rem_1fr_8rem_8rem_5rem] gap-2 border-b border-[--border-default] bg-[--bg-elevated]/50 px-4 py-2 text-[10px] font-semibold uppercase text-[--text-muted]">
                  <span>R</span><span>Гонка</span><span>Пилот 1</span><span>Пилот 2</span><span>Очки</span>
                </div>
                {races.map((race) => {
                  const racePoints = race.results.reduce((sum, result) => sum + Number(result.points || 0), 0)
                  const first = race.results[0]
                  const second = race.results[1]
                  return (
                    <Link key={race.round} href={`/race/${season}/${race.round}`} className="grid min-w-[760px] grid-cols-[3rem_1fr_8rem_8rem_5rem] items-center gap-2 border-b border-[--border-default] px-4 py-2.5 text-sm last:border-0 hover:bg-[--bg-elevated]">
                      <span className="font-mono text-xs text-[--text-muted]">{race.round}</span>
                      <span className="font-medium">{race.raceName}</span>
                      <DriverResult result={first} />
                      <DriverResult result={second} />
                      <span className="font-mono text-xs font-semibold">{racePoints}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[--text-muted]">Данные по команде пока недоступны.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function DriverResult({ result }: { result?: { driverCode: string; position: string; points: string } }) {
  if (!result) return <span className="text-xs text-[--text-muted]">-</span>
  return (
    <span className="text-xs">
      <span className="font-mono font-bold">{result.driverCode}</span>
      <span className="ml-1 text-[--text-muted]">P{result.position}</span>
    </span>
  )
}

