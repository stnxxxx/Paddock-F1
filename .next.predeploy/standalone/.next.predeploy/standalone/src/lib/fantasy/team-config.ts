import { type DbQuery } from "@/db"

/**
 * Team-mode (salary-cap) fantasy configuration. Game *rules* — budget, captain,
 * transfers, scoring formula — are concepts, freely reimplemented here; nothing is
 * copied from F1's site. Defaults live in code; an admin can override the scoring
 * curve and price model via app_meta without a redeploy (mirrors feed-weights).
 */

// ── squad composition (fixed game shape) ─────────────────────────────────────
export const SQUAD = {
  budget: 100.0, // $M
  drivers: 5,
  constructors: 2,
  freeTransfers: 2, // per round before a penalty applies
  transferPenalty: 10, // points deducted per extra transfer
  captainMultiplier: 2, // captain's points are doubled
} as const

// ── scoring formula ──────────────────────────────────────────────────────────
export interface FantasyScoring {
  /** Driver points by qualifying finishing position (index 0 = pole). Beyond the list → 0. */
  qualiPoints: number[]
  /** Driver out-qualified their team-mate. */
  beatTeammateQuali: number
  /** Driver points by race finishing position (index 0 = win). Beyond the list → 0. */
  racePoints: number[]
  /** Per position gained between grid and finish. */
  posGained: number
  /** Per position lost between grid and finish (negative). */
  posLost: number
  /** Cap on the magnitude of the grid→finish swing that scores. */
  maxPosSwing: number
  /** Driver set the race's fastest lap. */
  fastestLap: number
  /** Driver beat their team-mate in the race. */
  beatTeammateRace: number
  /** Did-not-finish / did-not-start penalty (negative). */
  dnf: number
  /** Small bonus for a classified finish. */
  finishBonus: number
  /** Constructor bonus when both its drivers are classified. */
  bothFinishBonus: number
  /** Constructor bonus for the fastest lap (on top of the driver's). */
  constructorFastestLap: number
}

export const DEFAULT_SCORING: FantasyScoring = {
  qualiPoints: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  beatTeammateQuali: 2,
  racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  posGained: 1,
  posLost: -1,
  maxPosSwing: 10,
  fastestLap: 10,
  beatTeammateRace: 3,
  dnf: -10,
  finishBonus: 1,
  bothFinishBonus: 5,
  constructorFastestLap: 5,
}

// ── price model ──────────────────────────────────────────────────────────────
export interface FantasyPriceModel {
  driverMin: number
  driverMax: number
  constructorMin: number
  constructorMax: number
  /** Curve shape: >1 concentrates value at the top of the grid. */
  gamma: number
}

export const DEFAULT_PRICE_MODEL: FantasyPriceModel = {
  driverMin: 5.0,
  driverMax: 30.0,
  constructorMin: 6.0,
  constructorMax: 25.0,
  gamma: 1.4,
}

// ── dynamic pricing (post-race market moves) ─────────────────────────────────
export interface FantasyPricing {
  /** Expected round points per $1M of price — the break-even line for performance. */
  expectedPpm: number
  /** Weight: round performance vs. the price-implied expectation. */
  wPerformance: number
  /** Weight: points-per-million value vs. the grid average for that asset kind. */
  wValue: number
  /** Weight: change in ownership among squads (demand / net transfers). */
  wOwnership: number
  /** Weight: rolling form vs. the asset's season average. */
  wForm: number
  /** Rounds in the rolling-form window. */
  formWindow: number
  /** Hard cap on how far a price can move in one round (±$M). */
  maxMovePerRound: number
  /** Price bounds. */
  floor: number
  ceil: number
}

export const DEFAULT_PRICING: FantasyPricing = {
  expectedPpm: 0.6,
  wPerformance: 0.30,
  wValue: 0.15,
  wOwnership: 0.40,
  wForm: 0.20,
  formWindow: 3,
  maxMovePerRound: 0.5,
  floor: 4.0,
  ceil: 35.0,
}

/**
 * Initial price for an entity at `rank` (0 = strongest) out of `total`, on the
 * configured min→max curve. Rounded to 0.1M. With the defaults, picking five top
 * drivers plus two top constructors blows the budget — forcing real trade-offs.
 */
export function priceForRank(rank: number, total: number, min: number, max: number, gamma: number): number {
  if (total <= 1) return Number(((min + max) / 2).toFixed(1))
  const t = (total - 1 - rank) / (total - 1) // 1 at the top, 0 at the back
  const price = min + (max - min) * Math.pow(Math.max(0, Math.min(1, t)), gamma)
  return Number(price.toFixed(1))
}

// ── persistence (admin override, like feed-weights) ──────────────────────────
interface FantasyConfig {
  scoring: FantasyScoring
  prices: FantasyPriceModel
  pricing: FantasyPricing
}

const SCORING_KEYS = Object.keys(DEFAULT_SCORING) as (keyof FantasyScoring)[]
const PRICE_KEYS = Object.keys(DEFAULT_PRICE_MODEL) as (keyof FantasyPriceModel)[]
const PRICING_KEYS = Object.keys(DEFAULT_PRICING) as (keyof FantasyPricing)[]

export async function loadFantasyConfig(db: DbQuery): Promise<FantasyConfig> {
  let scoring = DEFAULT_SCORING
  let prices = DEFAULT_PRICE_MODEL
  let pricing = DEFAULT_PRICING
  try {
    const row = await db.get<{ value?: string }>("SELECT value FROM app_meta WHERE key = 'fantasy_team_config'")
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<FantasyConfig>
      if (parsed.scoring) scoring = { ...DEFAULT_SCORING, ...parsed.scoring }
      if (parsed.prices) prices = { ...DEFAULT_PRICE_MODEL, ...parsed.prices }
      if (parsed.pricing) pricing = { ...DEFAULT_PRICING, ...parsed.pricing }
    }
  } catch {
    // Malformed override — fall back to defaults.
  }
  return { scoring, prices, pricing }
}

/** Validates + persists an override. Unknown keys ignored; non-finite numbers dropped. */
export async function saveFantasyConfig(db: DbQuery, partial: { scoring?: Record<string, unknown>; prices?: Record<string, unknown>; pricing?: Record<string, unknown> }): Promise<FantasyConfig> {
  const current = await loadFantasyConfig(db)
  const scoring: FantasyScoring = { ...current.scoring }
  const prices: FantasyPriceModel = { ...current.prices }
  const pricing: FantasyPricing = { ...current.pricing }
  const scoringRec = scoring as unknown as Record<string, number | number[]>
  const priceRec = prices as unknown as Record<string, number>
  const pricingRec = pricing as unknown as Record<string, number>

  if (partial.scoring) {
    for (const key of SCORING_KEYS) {
      const v = partial.scoring[key]
      if (Array.isArray(DEFAULT_SCORING[key])) {
        if (Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n))) scoringRec[key] = v as number[]
      } else if (typeof v === "number" && Number.isFinite(v)) {
        scoringRec[key] = v
      }
    }
  }
  if (partial.prices) {
    for (const key of PRICE_KEYS) {
      const v = partial.prices[key]
      if (typeof v === "number" && Number.isFinite(v)) priceRec[key] = v
    }
  }
  if (partial.pricing) {
    for (const key of PRICING_KEYS) {
      const v = partial.pricing[key]
      if (typeof v === "number" && Number.isFinite(v)) pricingRec[key] = v
    }
  }

  const merged: FantasyConfig = { scoring, prices, pricing }
  await db.run(
    "INSERT INTO app_meta (key, value) VALUES ('fantasy_team_config', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(merged)]
  )
  return merged
}