import { type DbQuery } from "@/db"
import { loadFantasyConfig } from "./team-config"

/**
 * Dynamic market pricing. After a round resolves, every asset's price is nudged by a
 * weighted blend of signals derived from the race + the market itself:
 *
 *  • performance — round fantasy points vs. the price-implied expectation
 *  • value       — points-per-$M vs. the grid average for that asset kind
 *  • ownership    — change in how many squads hold the asset (demand / net transfers)
 *  • form         — rolling average over the last N rounds vs. the season average
 *
 * Moves are clamped per round and bounded by a floor/ceiling. Weights, window and
 * bounds are admin-tunable (app_meta.fantasy_team_config → pricing).
 */

type Kind = "driver" | "constructor"
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const round1 = (x: number) => Math.round(x * 10) / 10

interface HistRow { id: string; rnd: number; pts: number }
interface AssetRow { id: string; kind: Kind; price: number }

async function ownershipAt(db: DbQuery, roundId: string): Promise<{ counts: Map<string, number>; total: number }> {
  const rows = await db.all<{ picks: string }>("SELECT picks FROM fantasy_lineups WHERE round_id = ?", [roundId])
  const counts = new Map<string, number>()
  for (const r of rows) {
    try {
      const p = JSON.parse(r.picks) as { drivers?: string[]; constructors?: string[] }
      for (const id of [...(p.drivers || []), ...(p.constructors || [])]) counts.set(id, (counts.get(id) || 0) + 1)
    } catch { /* skip malformed */ }
  }
  return { counts, total: rows.length }
}

export async function recomputePrices(db: DbQuery, season: number, roundId: string): Promise<void> {
  const { pricing } = await loadFantasyConfig(db)
  const roundRow = await db.get<{ round: number }>("SELECT round FROM fantasy_rounds WHERE id = ?", [roundId])
  if (!roundRow) return
  const roundNumber = roundRow.round

  // Per-asset score history up to and including this round.
  const hist = await db.all<HistRow>(`
    SELECT s.asset_id AS id, r.round AS rnd, s.points AS pts
    FROM fantasy_asset_scores s JOIN fantasy_rounds r ON r.id = s.round_id
    WHERE r.season = ? AND r.round <= ?
    ORDER BY s.asset_id, r.round
  `, [season, roundNumber])
  const byAsset = new Map<string, HistRow[]>()
  for (const h of hist) {
    const arr = byAsset.get(h.id) || []
    arr.push(h)
    byAsset.set(h.id, arr)
  }

  // Ownership this round vs. the previous round (demand signal).
  const own = await ownershipAt(db, roundId)
  const prevRound = await db.get<{ id: string }>(
    "SELECT id FROM fantasy_rounds WHERE season = ? AND round < ? ORDER BY round DESC LIMIT 1",
    [season, roundNumber]
  )
  const ownPrev = prevRound ? await ownershipAt(db, prevRound.id) : { counts: new Map<string, number>(), total: 0 }

  const assets = await db.all<AssetRow>("SELECT id, kind, price FROM fantasy_assets WHERE season = ?", [season])

  // Grid-average points-per-$M per kind (this round's participants only).
  const ppm: Record<Kind, number[]> = { driver: [], constructor: [] }
  for (const a of assets) {
    const rp = byAsset.get(a.id)?.find((x) => x.rnd === roundNumber)
    if (rp && a.price > 0) ppm[a.kind].push(rp.pts / a.price)
  }
  const gridPpm: Record<Kind, number> = { driver: avg(ppm.driver), constructor: avg(ppm.constructor) }

  await db.transaction(async (db) => {
    for (const a of assets) {
      const arr = byAsset.get(a.id)
      const rp = arr?.find((x) => x.rnd === roundNumber)
      // Didn't feature this round → price holds, indicator clears.
      if (!rp || !arr) { await db.run("UPDATE fantasy_assets SET price = ?, price_delta = ? WHERE id = ?", [a.price, 0, a.id]); continue }

      const price = a.price
      const expected = price * pricing.expectedPpm
      const perfNorm = clamp((rp.pts - expected) / Math.max(8, expected), -1.5, 1.5)

      const assetPpm = rp.pts / Math.max(1, price)
      const gp = gridPpm[a.kind]
      const valueNorm = clamp((assetPpm - gp) / Math.max(0.4, Math.abs(gp) || 0.4), -1.5, 1.5)

      const formAvg = avg(arr.slice(-pricing.formWindow).map((x) => x.pts))
      const seasonAvg = avg(arr.map((x) => x.pts))
      const formNorm = clamp((formAvg - seasonAvg) / Math.max(8, Math.abs(seasonAvg) + 4), -1.5, 1.5)

      const oNow = own.total ? (own.counts.get(a.id) || 0) / own.total : 0
      const oPrev = ownPrev.total ? (ownPrev.counts.get(a.id) || 0) / ownPrev.total : 0
      const ownNorm = clamp((oNow - oPrev) * 3, -1, 1)

      const raw =
        pricing.wPerformance * perfNorm +
        pricing.wValue * valueNorm +
        pricing.wOwnership * ownNorm +
        pricing.wForm * formNorm

      const delta = clamp(round1(raw), -pricing.maxMovePerRound, pricing.maxMovePerRound)
      const newPrice = clamp(round1(price + delta), pricing.floor, pricing.ceil)
      const applied = round1(newPrice - price) // actual move after bounds
      await db.run("UPDATE fantasy_assets SET price = ?, price_delta = ? WHERE id = ?", [newPrice, applied, a.id])
    }
  })
}