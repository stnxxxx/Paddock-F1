interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

export async function memoized<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined
  if (hit && hit.expiresAt > now) return hit.value

  const value = await load()
  memoryCache.set(key, { value, expiresAt: now + ttlMs })
  return value
}

export function clearF1Cache(prefix = "f1:") {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key)
  }
}
