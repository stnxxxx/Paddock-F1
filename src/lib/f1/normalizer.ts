const NORMALIZE_TEAM: Record<string, string> = {
  "Alpine F1 Team": "Alpine",
  "Haas F1 Team": "Haas",
  "RB F1 Team": "Racing Bulls",
  "Visa Cash App RB Formula One Team": "Racing Bulls",
  "Aston Martin": "Aston Martin",
  "Aston Martin Aramco F1 Team": "Aston Martin",
  "Kick Sauber": "Audi",
  Sauber: "Audi",
}

const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#00d2be",
  Ferrari: "#dc0000",
  McLaren: "#ff8000",
  "Red Bull": "#1e41ff",
  "Red Bull Racing": "#1e41ff",
  Alpine: "#0093cc",
  "Racing Bulls": "#6692ff",
  Haas: "#b6babd",
  Williams: "#005aff",
  Audi: "#e10600",
  "Aston Martin": "#006f62",
  Cadillac: "#003d7c",
}

export function normalizeTeam(name?: string | null): string {
  if (!name) return ""
  return NORMALIZE_TEAM[name] || name
}

export function getF1TeamColor(team?: string | null): string {
  if (!team) return "#888888"
  const normalized = normalizeTeam(team)
  return TEAM_COLORS[normalized] || TEAM_COLORS[team] || "#888888"
}

export function normalizeDriverCode(driver: { code?: string; driverId?: string; permanentNumber?: string }, fallback = "") {
  if (driver.code) return driver.code
  if (driver.driverId) return driver.driverId.slice(0, 3).toUpperCase()
  return fallback
}

export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function latestBy<T>(items: T[], getDate: (item: T) => string | undefined): T | undefined {
  return [...items].sort((a, b) => {
    const ad = Date.parse(getDate(a) || "")
    const bd = Date.parse(getDate(b) || "")
    return (Number.isFinite(bd) ? bd : 0) - (Number.isFinite(ad) ? ad : 0)
  })[0]
}
