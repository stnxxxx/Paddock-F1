import type { MetadataRoute } from "next"
import { getDb } from "@/db"
import { getCurrentCalendar } from "@/lib/f1/jolpica"

export const dynamic = "force-dynamic"

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
  ].map((route) => ({
    url: baseUrl + route,
    lastModified: new Date(),
    changeFrequency: route === "/live" ? "hourly" as const : "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }))

  const entityRoutes: MetadataRoute.Sitemap = [
    ...driverRoutes.map((code) => "/drivers/" + code),
    ...teamRoutes.map((slug) => "/teams/" + slug),
  ].map((route) => ({
    url: baseUrl + route,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const [races, publications] = await Promise.all([
    getCurrentCalendar().catch(() => []),
    getDb().all<{ id: string; updated_at: string }>(
      "SELECT p.id, p.updated_at FROM posts p JOIN newsbot_publications np ON np.post_id = p.id WHERE p.deleted = 0 ORDER BY p.updated_at DESC LIMIT 5000"
    ).catch(() => []),
  ])

  const raceRoutes: MetadataRoute.Sitemap = races.map((race) => ({
    url: baseUrl + "/race/" + race.season + "/" + race.round,
    lastModified: new Date(race.date),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const publicationRoutes: MetadataRoute.Sitemap = publications.map((post) => ({
    url: baseUrl + "/post/" + post.id,
    lastModified: new Date(post.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...entityRoutes, ...raceRoutes, ...publicationRoutes]
}
