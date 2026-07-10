"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface Props {
  team: string
  className?: string
  size?: number
}

interface TeamEntry {
  /** Bundled logo in /public/logos/<slug>.<ext>. Only current teams have one. */
  slug?: string
  /** File extension of the bundled logo (defaults to "webp"). */
  ext?: string
  color: string
}

/**
 * Team registry. Only current teams ship a logo file; for every other team we
 * keep just a brand colour (used for dots/accents) and render no logo at all.
 */
const TEAMS: Record<string, TeamEntry> = {
  // Current grid — bundled webp logos
  "Red Bull": { slug: "redbull", color: "#1e41ff" },
  Ferrari: { slug: "ferrari", color: "#dc0000" },
  McLaren: { slug: "mclaren", color: "#ff8000" },
  Mercedes: { slug: "mercedes", color: "#00d2be" },
  "Aston Martin": { slug: "astonmartin", color: "#006f62" },
  Alpine: { slug: "alpine", color: "#0093cc" },
  Williams: { slug: "williams", color: "#005aff" },
  "Racing Bulls": { slug: "racingbulls", color: "#6692ff" },
  Haas: { slug: "haas", color: "#b6babd" },
  Audi: { slug: "audi", color: "#e10600" },
  Cadillac: { slug: "cadillac", color: "#003d7c" },

  // Historical / defunct teams — colour only, no logo
  Sauber: { color: "#52e252" },
  "Alfa Romeo": { color: "#9b0000" },
  AlphaTauri: { color: "#2b4562" },
  "Toro Rosso": { color: "#469bff" },
  "Force India": { color: "#ff80c7" },
  "Racing Point": { color: "#f596c8" },
  Renault: { color: "#ffd800" },
  "Lotus F1": { color: "#ffb800" },
  Caterham: { color: "#00533f" },
  Marussia: { color: "#b30710" },
  "Manor Marussia": { color: "#ee2025" },
  Virgin: { color: "#c8102e" },
  HRT: { color: "#b8985a" },
  Toyota: { color: "#e80000" },
  Honda: { color: "#e2001a" },
  BAR: { color: "#d40000" },
  "BMW Sauber": { color: "#0066b1" },
  Jaguar: { color: "#16693b" },
  Stewart: { color: "#d4d4d4" },
  Jordan: { color: "#ffd320" },
  "Super Aguri": { color: "#c8102e" },
  Spyker: { color: "#ff6a00" },
  Midland: { color: "#c00000" },
  Brawn: { color: "#b6ff00" },
  Benetton: { color: "#00873e" },
  Brabham: { color: "#1d3f8f" },
  Tyrrell: { color: "#003a70" },
  Ligier: { color: "#0a4ea2" },
  Minardi: { color: "#1a1a1a" },
  Arrows: { color: "#ff7a00" },
  Prost: { color: "#0a2d6e" },
  "Team Lotus": { color: "#00543d" },
  Lotus: { color: "#00543d" },
  March: { color: "#e30613" },
  Shadow: { color: "#1a1a1a" },
  Wolf: { color: "#1d2b5a" },
  BRM: { color: "#1f5132" },
  Cooper: { color: "#00543d" },
}

/** Raw API name variants → canonical registry key. Covers sponsor-laden names. */
const ALIASES: Record<string, string> = {
  "red bull racing": "Red Bull",
  "scuderia ferrari": "Ferrari",
  "mercedes amg": "Mercedes",
  "mercedes amg petronas": "Mercedes",
  "aston martin aramco": "Aston Martin",
  "aston martin aramco f1 team": "Aston Martin",
  "aston martin aramco cognizant f1 team": "Aston Martin",
  "alpine f1 team": "Alpine",
  "bwt alpine f1 team": "Alpine",
  "haas f1 team": "Haas",
  "moneygram haas f1 team": "Haas",
  "rb f1 team": "Racing Bulls",
  "visa cash app rb": "Racing Bulls",
  "visa cash app rb f1 team": "Racing Bulls",
  "visa cash app rb formula one team": "Racing Bulls",
  "kick sauber": "Audi",
  "stake f1 team kick sauber": "Audi",
  "cadillac f1 team": "Cadillac",
  "cadillac formula 1 team": "Cadillac",
  "alfa romeo racing": "Alfa Romeo",
  "alfa romeo f1 team": "Alfa Romeo",
  "scuderia toro rosso": "Toro Rosso",
  "scuderia alphatauri": "AlphaTauri",
  "racing point f1 team": "Racing Point",
  "bwt racing point f1 team": "Racing Point",
  "sahara force india f1 team": "Force India",
  "force india f1 team": "Force India",
  "renault f1 team": "Renault",
  "lotus f1 team": "Lotus F1",
  "marussia f1 team": "Marussia",
  "manor marussia f1 team": "Manor Marussia",
  "manor racing": "Manor Marussia",
  "caterham f1 team": "Caterham",
  "hrt f1 team": "HRT",
  "hispania racing": "HRT",
  "spyker f1": "Spyker",
  "mf1 racing": "Midland",
  mf1: "Midland",
  "midland f1": "Midland",
  "brawn gp": "Brawn",
  "bmw sauber f1 team": "BMW Sauber",
}

function canon(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
}

const REGISTRY_INDEX: Record<string, string> = {}
for (const key of Object.keys(TEAMS)) REGISTRY_INDEX[canon(key)] = key

const ALIAS_INDEX: Record<string, string> = {}
for (const [k, v] of Object.entries(ALIASES)) ALIAS_INDEX[canon(k)] = v

const REGISTRY_BY_LEN = Object.keys(TEAMS)
  .map((k) => [canon(k), k] as const)
  .sort((a, b) => b[0].length - a[0].length)

function matchByName(c: string): string | "" {
  let best = ""
  let bestLen = 0
  for (const [ck, key] of REGISTRY_BY_LEN) {
    if (ck.length >= 4 && c.startsWith(ck) && ck.length > bestLen) {
      best = key
      bestLen = ck.length
    }
  }
  if (best) return best
  for (const [ck, key] of REGISTRY_BY_LEN) {
    if (ck.length >= 5 && c.includes(ck)) return key
  }
  return ""
}

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return hslToHex(h % 360, 55, 42)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function resolveTeam(team: string): { name: string; entry: TeamEntry } {
  const c = canon(team)
  const key = ALIAS_INDEX[c] || REGISTRY_INDEX[c] || matchByName(c)
  if (key && TEAMS[key]) return { name: key, entry: TEAMS[key] }
  return { name: team, entry: { color: hashColor(team) } }
}

export function getTeamColor(team: string): string {
  if (!team) return "#888"
  return resolveTeam(team).entry.color
}

/** Back-compat: a flat color map of canonical teams. */
export const TEAM_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TEAMS).map(([k, v]) => [k, v.color])
)

export function TeamLogo({ team, className, size = 20 }: Props) {
  if (!team) return null
  const { name, entry } = resolveTeam(team)
  // Only current teams have a logo file; everyone else renders nothing.
  if (!entry.slug) return null

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)} style={{ height: size }} title={name}>
      <Image
        src={`/logos/${entry.slug}.${entry.ext ?? "webp"}`}
        alt={name}
        width={0}
        height={0}
        sizes={`${size * 5}px`}
        className="h-full w-auto"
        unoptimized
      />
    </span>
  )
}

export function TeamDot({ team, className }: { team: string; className?: string }) {
  return <span className={cn("w-2 h-2 rounded-full shrink-0", className)} style={{ backgroundColor: getTeamColor(team) }} />
}
