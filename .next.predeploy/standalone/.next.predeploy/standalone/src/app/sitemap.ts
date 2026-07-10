import type { MetadataRoute } from "next"
import { getCurrentCalendar } from "@/lib/f1/jolpica"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const driverRoutes = ["VER", "NOR", "PIA", "LEC", "HAM", "RUS", "ANT", "GAS", "ALB", "ALO"]
const teamRoutes = ["mclaren", "mercedes", "red-bull", "ferrari", "alpine", "williams", "racing-bulls", "haas", "aston-martin", "audi", "cadillac"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/live",
    "/stats",
    "/fantasy",
    "/leaderboard",
    "/watch",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/live" ? "hourly" as const : "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }))

  const entityRoutes: MetadataRoute.Sitemap = [
    ...driverRoutes.map((code) => `/drivers/${code}`),
    ...teamRoutes.map((slug) => `/teams/${slug}`),
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  try {
    const races = await getCurrentCalendar()
    return [
      ...staticRoutes,
      ...entityRoutes,
      ...races.map((race) => ({
        url: `${baseUrl}/race/${race.season}/${race.round}`,
        lastModified: new Date(race.date),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ]
  } catch {
    return [...staticRoutes, ...entityRoutes]
  }
}
