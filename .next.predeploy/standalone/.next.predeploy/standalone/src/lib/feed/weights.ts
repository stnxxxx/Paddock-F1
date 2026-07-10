import { type DbQuery } from "@/db"

/**
 * Tunable weights for the "Для вас" ranking model. Defaults live in code; an admin
 * can override them via app_meta.feed_weights (JSON) without a redeploy.
 */
export interface FeedWeights {
  fresh: number // recency gravity term: 1/(age_h+2)^1.5
  engage: number // engagement velocity: (up-down+0.5*comments)/(age_h+2)
  follow: number // author followed OR community subscribed
  team: number // post matches the user's favourite team
  driver: number // post matches the user's favourite driver
  topic: number // per overlapping top-tag with the user's interest profile
  author: number // normalized author karma
  penaltyDownvotedAuthor: number // user previously downvoted this author
  penaltySeen: number // user already saw this post
  discoveryShare: number // min fraction of out-of-network posts per page (0..1)
  maxPerAuthorPerPage: number // diversity cap
}

export const DEFAULT_WEIGHTS: FeedWeights = {
  fresh: 1.0,
  engage: 1.2,
  follow: 3.0,
  team: 1.5,
  driver: 1.5,
  topic: 0.8,
  author: 0.5,
  penaltyDownvotedAuthor: 2.5,
  penaltySeen: 4.0,
  discoveryShare: 0.3,
  maxPerAuthorPerPage: 3,
}

const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as (keyof FeedWeights)[]

export async function loadFeedWeights(db: DbQuery): Promise<FeedWeights> {
  try {
    const row = await db.get<{ value?: string }>("SELECT value FROM app_meta WHERE key = 'feed_weights'")
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<FeedWeights>
      return { ...DEFAULT_WEIGHTS, ...parsed }
    }
  } catch {
    // Malformed override — fall back to defaults.
  }
  return DEFAULT_WEIGHTS
}

/** Validates + persists an override. Unknown keys are ignored; values are clamped to finite numbers. */
export async function saveFeedWeights(db: DbQuery, partial: Record<string, unknown>): Promise<FeedWeights> {
  const clean: Partial<FeedWeights> = {}
  for (const key of WEIGHT_KEYS) {
    const v = partial[key]
    if (typeof v === "number" && Number.isFinite(v)) clean[key] = v
  }
  const merged: FeedWeights = { ...(await loadFeedWeights(db)), ...clean }
  await db.run(
    "INSERT INTO app_meta (key, value) VALUES ('feed_weights', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(merged)]
  )
  return merged
}