import { computeSessionStats } from "@/lib/f1/session-stats"
import { apiError, apiResponse } from "@/lib/auth"

// Team sector + top-speed rankings for a session (broadcast-style boards).
// Computed on first view; the underlying OpenF1 fetches are memoized, so
// repeated views within the cache window are served without re-fetching.
export async function GET(_req: Request, { params }: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await params
  const key = Number(sessionKey)
  if (!Number.isFinite(key)) return apiError("Некорректный sessionKey", 400)

  try {
    const stats = await computeSessionStats(key)
    return apiResponse(stats)
  } catch {
    return apiError("Не удалось посчитать статистику сессии", 502)
  }
}
