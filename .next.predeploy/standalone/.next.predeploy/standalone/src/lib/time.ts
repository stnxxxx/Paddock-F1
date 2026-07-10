// Timestamps in the DB come in two shapes:
//   - SQLite `datetime('now')` → "YYYY-MM-DD HH:MM:SS" (UTC, no timezone marker)
//   - JS `new Date().toISOString()` → "YYYY-MM-DDTHH:MM:SS.sssZ" (already UTC)
// Naively appending "Z" breaks the second form, so detect the format first.
export function parseDbDate(dateStr: string): number {
  if (!dateStr) return NaN
  // Already carries timezone info (trailing Z or ±HH:MM offset) — parse as-is.
  if (/[zZ]$|[+-]\d\d:?\d\d$/.test(dateStr)) return new Date(dateStr).getTime()
  // Bare SQLite datetime is UTC — normalize to ISO UTC.
  return new Date(dateStr.replace(" ", "T") + "Z").getTime()
}

export function timeAgo(dateStr: string): string {
  const ts = parseDbDate(dateStr)
  if (!Number.isFinite(ts)) return ""
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "только что"
  if (mins < 60) return `${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} д`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес`
  return `${Math.floor(months / 12)} г`
}
