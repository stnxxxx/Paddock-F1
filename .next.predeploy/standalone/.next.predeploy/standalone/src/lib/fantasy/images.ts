/**
 * Free-licence image lookup for fantasy assets. Pulls the lead photo of a Wikipedia
 * article via the REST summary API, but only accepts images hosted on Wikimedia
 * **Commons** (i.e. freely licensed — CC / public domain), never the local non-free
 * uploads used under fair-use. Attribution (author + licence) is fetched from Commons
 * and stored so we can credit it, as the licences require.
 *
 * Server-only (outbound fetch to Wikimedia). Run from a script / admin endpoint, not
 * per request.
 */

const UA = "PaddockFantasy/1.0 (https://paddock.local; contact: admin)"

export interface WikiImage {
  url: string
  credit: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Commons file licence + author, formatted for a credit line. */
async function fetchCommonsCredit(fileName: string): Promise<string> {
  try {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + fileName)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
    const r = await fetch(api, { headers: { "User-Agent": UA } })
    if (!r.ok) return "Wikimedia Commons"
    const json = await r.json() as { query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value?: string }> }[] }> } }
    const page = Object.values(json.query?.pages ?? {})[0]
    const em = page?.imageinfo?.[0]?.extmetadata
    const artist = em?.Artist?.value ? stripHtml(em.Artist.value) : ""
    const license = em?.LicenseShortName?.value ? stripHtml(em.LicenseShortName.value) : ""
    const credit = [artist, license].filter(Boolean).join(" · ")
    return credit || "Wikimedia Commons"
  } catch {
    return "Wikimedia Commons"
  }
}

/** Canonical Wikipedia article title for an Ergast/Jolpica driver id (disambiguation-safe). */
export async function fetchDriverWikiTitle(jolpicaId: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.jolpi.ca/ergast/f1/drivers/${jolpicaId}.json`, { headers: { "User-Agent": UA } })
    if (!r.ok) return null
    const json = await r.json() as { MRData?: { DriverTable?: { Drivers?: { url?: string }[] } } }
    const url = json.MRData?.DriverTable?.Drivers?.[0]?.url
    if (!url) return null
    const title = url.split("/wiki/")[1]
    return title ? decodeURIComponent(title) : null
  } catch {
    return null
  }
}

/**
 * Resolves the lead Commons image for a Wikipedia article (by title or person name).
 * Returns null when the article has no image or the image isn't Commons-hosted (so we
 * never serve a non-free file). Follows redirects, so "Max Verstappen" → its article.
 */
export async function fetchWikiImage(title: string): Promise<WikiImage | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })
    if (!r.ok) return null
    const data = await r.json() as {
      originalimage?: { source?: string }
      thumbnail?: { source?: string }
    }
    const original = data.originalimage?.source || ""
    const thumb = data.thumbnail?.source || original
    // Free-licence guard: only Commons-hosted images (non-free local uploads live under /wikipedia/en/).
    if (!original.includes("/wikipedia/commons/") && !thumb.includes("/wikipedia/commons/")) return null
    const fileSource = original || thumb
    const rawFile = decodeURIComponent(fileSource.split("/").pop() || "").replace(/^\d+px-/, "")
    const credit = await fetchCommonsCredit(rawFile)
    // Use the REST thumbnail verbatim — Wikimedia only serves the sizes it has rendered,
    // so requesting an arbitrary width can 404. The thumb (~250–320px) suits the card.
    const display = thumb || original
    return { url: display, credit }
  } catch {
    return null
  }
}
