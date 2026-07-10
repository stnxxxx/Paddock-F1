import { type DbQuery } from "@/db"

type Param = string | number

export type AchievementMetric =
  | "posts" | "comments" | "upvotes" | "bookmarks" | "fantasyWins" | "karma" | "tenureDays"

export interface AchievementDef {
  id: string
  metric: AchievementMetric
  target: number
}

/** Unlock criteria for each achievement: which metric and how much of it. */
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "ach-first-post", metric: "posts", target: 1 },
  { id: "ach-10-posts", metric: "posts", target: 10 },
  { id: "ach-50-upvotes", metric: "upvotes", target: 50 },
  { id: "ach-100-karma", metric: "karma", target: 100 },
  { id: "ach-500-karma", metric: "karma", target: 500 },
  { id: "ach-1000-karma", metric: "karma", target: 1000 },
  { id: "ach-first-comment", metric: "comments", target: 1 },
  { id: "ach-bookmark-5", metric: "bookmarks", target: 5 },
  { id: "ach-fantasy-win", metric: "fantasyWins", target: 1 },
  { id: "ach-veteran", metric: "tenureDays", target: 30 },
]

const count = async (db: DbQuery, sql: string, ...params: Param[]): Promise<number> =>
  (await db.get<{ c: number }>(sql, params))?.c ?? 0

export async function computeAchievementMetrics(db: DbQuery, userId: string): Promise<Record<AchievementMetric, number>> {
  const user = await db.get<{ karma?: number; created_at?: string }>(
    "SELECT karma, created_at FROM users WHERE id = ?", [userId]
  )
  const tenureDays = user?.created_at
    ? Math.max(0, Math.floor((Date.now() - Date.parse(user.created_at)) / 86_400_000))
    : 0
  return {
    posts: await count(db, "SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND deleted = 0", userId),
    comments: await count(db, "SELECT COUNT(*) as c FROM comments WHERE user_id = ? AND deleted = 0", userId),
    upvotes: await count(db, "SELECT COUNT(*) as c FROM votes v JOIN posts p ON p.id = v.post_id WHERE p.user_id = ? AND p.deleted = 0 AND v.direction = 1", userId),
    bookmarks: await count(db, "SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?", userId),
    fantasyWins: await count(db, "SELECT COUNT(*) as c FROM fantasy_entries WHERE user_id = ? AND points > 0", userId),
    karma: user?.karma || 0,
    tenureDays,
  }
}

export async function checkAndGrantAchievements(db: DbQuery, userId: string) {
  const metrics = await computeAchievementMetrics(db, userId)
  for (const def of ACHIEVEMENT_DEFS) {
    if (metrics[def.metric] >= def.target) {
      await db.run(
        "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?) ON CONFLICT (user_id, achievement_id) DO NOTHING",
        [userId, def.id]
      )
    }
  }
}

export interface AchievementProgress {
  id: string
  name: string
  description: string
  icon: string
  target: number
  current: number
  earned: boolean
}

/** Every achievement with this user's current progress — earned first, then closest to unlock. */
export async function getAchievementProgress(db: DbQuery, userId: string): Promise<AchievementProgress[]> {
  const metrics = await computeAchievementMetrics(db, userId)
  const defs = new Map(ACHIEVEMENT_DEFS.map((d) => [d.id, d]))
  const rows = await db.all<{ id: string; name: string; description: string; icon: string }>(
    "SELECT id, name, description, icon FROM achievements"
  )

  return rows
    .flatMap((r) => {
      const def = defs.get(r.id)
      if (!def) return []
      const raw = metrics[def.metric]
      return [{
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        target: def.target,
        current: Math.min(raw, def.target),
        earned: raw >= def.target,
      }]
    })
    .sort((a, b) => Number(b.earned) - Number(a.earned) || b.current / b.target - a.current / a.target)
}