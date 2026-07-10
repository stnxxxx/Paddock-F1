import { apiError } from "@/lib/auth"

// Lightweight in-memory rate limiter. Suitable for a single-instance deployment
// (which matches the SQLite/better-sqlite3 setup). For multi-instance scaling
// this should move to a shared store (Redis, etc.).

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

function sweep(now: number) {
  // Opportunistically drop expired buckets so the map does not grow unbounded.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export interface RateLimitResult {
  ok: boolean
  retryAfter: number // seconds
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (bucket.count >= max) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, retryAfter: 0 }
}

// Convenience guard: returns a 429 Response when the limit is exceeded, else null.
export function rateLimitGuard(
  req: Request,
  scope: string,
  max: number,
  windowMs: number
): Response | null {
  const result = rateLimit(`${scope}:${getClientIp(req)}`, max, windowMs)
  if (result.ok) return null
  return apiError(
    `Слишком много запросов. Повторите через ${result.retryAfter} с.`,
    429
  )
}
