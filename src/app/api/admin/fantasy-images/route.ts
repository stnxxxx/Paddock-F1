import fs from "node:fs"
import path from "node:path"
import { getDb } from "@/db"
import { requireAdmin, apiResponse } from "@/lib/auth"
import { ensureFantasyAssets } from "@/lib/fantasy/team"
import { fetchWikiImage, fetchDriverWikiTitle } from "@/lib/fantasy/images"
import { ALL_DRIVERS, getJolpicaDriverId } from "@/lib/drivers"

const IMG_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".avif"])
// Alphanumeric-only key so "Red Bull" / "redbull" / "aston martin" all collapse to one form.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
// Filename → constructor aliases that normalization alone can't bridge.
const CONSTRUCTOR_ALIAS: Record<string, string> = { rb: "racingbulls" }

interface AssetRow { id: string; kind: "driver" | "constructor"; ref: string }

/** Wires hand-supplied files from /public/fantasy/{drivers,constructors} onto the cards. */
async function populateLocal(db: ReturnType<typeof getDb>, season: number) {
  const root = path.join(process.cwd(), "public", "fantasy")
  const assets = await db.all("SELECT id, kind, ref FROM fantasy_assets WHERE season = ?", [season]) as AssetRow[]
  const byCode = new Map(assets.filter((a) => a.kind === "driver").map((a) => [a.ref.toUpperCase(), a]))
  const byKey = new Map(assets.filter((a) => a.kind === "constructor").map((a) => [norm(a.ref), a]))

  const matched: string[] = []
  const scan = async (sub: "drivers" | "constructors", lookup: (base: string) => AssetRow | undefined) => {
    const dir = path.join(root, sub)
    if (!fs.existsSync(dir)) return
    for (const file of fs.readdirSync(dir)) {
      if (!IMG_EXTS.has(path.extname(file).toLowerCase())) continue
      const asset = lookup(path.basename(file, path.extname(file)))
      if (asset) { await db.run("UPDATE fantasy_assets SET image = ?, image_credit = NULL WHERE id = ?", [`/fantasy/${sub}/${encodeURIComponent(file)}`, asset.id]); matched.push(asset.ref) }
    }
  }
  await scan("drivers", (b) => byCode.get(b.toUpperCase()))
  await scan("constructors", (b) => { const k = norm(b); return byKey.get(CONSTRUCTOR_ALIAS[k] ?? k) })
  return { updated: matched.length, matched }
}

/** Pulls free-licensed driver portraits from Wikimedia Commons (with attribution). */
async function populateWiki(db: ReturnType<typeof getDb>, season: number, force: boolean) {
  const where = force ? "" : "AND (image IS NULL OR image = '')"
  const drivers = await db.all(`SELECT id, ref FROM fantasy_assets WHERE season = ? AND kind = 'driver' ${where}`, [season]) as { id: string; ref: string }[]
  const misses: string[] = []
  let updated = 0
  for (const d of drivers) {
    const name = ALL_DRIVERS.find((x) => x.code === d.ref)?.name || d.ref
    const title = await fetchDriverWikiTitle(getJolpicaDriverId(d.ref))
    const img = (title ? await fetchWikiImage(title) : null) ?? await fetchWikiImage(name)
    if (img) { await db.run("UPDATE fantasy_assets SET image = ?, image_credit = ? WHERE id = ?", [img.url, img.credit, d.id]); updated++ }
    else misses.push(d.ref)
  }
  return { candidates: drivers.length, updated, missed: misses }
}

/**
 * Populates fantasy asset images. Admin-only.
 *  • { source: "local" }  — wire files dropped in /public/fantasy/{drivers,constructors}.
 *  • { source: "wiki" }   — fetch free-licensed driver portraits from Wikimedia (default).
 * Pass { force: true } to overwrite assets that already have an image.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error

  const db = getDb()
  const body = await req.json().catch(() => ({})) as { season?: number; source?: string; force?: boolean }
  const season = Number(body?.season) || new Date().getUTCFullYear()
  await ensureFantasyAssets(db, season)

  if (body?.source === "local") {
    return apiResponse({ season, source: "local", ...(await populateLocal(db, season)) })
  }
  return apiResponse({ season, source: "wiki", ...(await populateWiki(db, season, body?.force === true)) })
}