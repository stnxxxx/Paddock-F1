import { revalidateTag } from "next/cache"
import {
  F1_CACHE_TAG,
  fetchRaceSchedule,
  fetchAllStandings,
  fetchLastRaceResults,
  fetchNextRace,
  isRaceWeekend,
} from "@/lib/f1-data"

// During a race weekend results move fast, so we refresh tightly; otherwise a
// relaxed cadence is enough to keep standings and the calendar current.
const NORMAL_MS = 15 * 60_000
const WEEKEND_MS = 2 * 60_000
const FIRST_RUN_MS = 30_000

interface SchedulerState {
  running: boolean
  timer?: ReturnType<typeof setTimeout>
  lastRun?: string
}

declare global {
  var __f1Scheduler: SchedulerState | undefined
}

async function refresh() {
  // Invalidate the tagged fetch cache, then re-warm the hot endpoints so the
  // data is fresh before any visitor requests it.
  try {
    revalidateTag(F1_CACHE_TAG, "max")
  } catch {
    // revalidateTag can be a no-op outside a request — the time-based revalidate
    // windows still keep data fresh, so this is non-fatal.
  }
  await Promise.allSettled([fetchAllStandings(), fetchLastRaceResults(), fetchNextRace()])
  globalThis.__f1Scheduler!.lastRun = new Date().toISOString()
}

async function nextDelay(): Promise<number> {
  try {
    const { races } = await fetchRaceSchedule()
    return isRaceWeekend(races) ? WEEKEND_MS : NORMAL_MS
  } catch {
    return NORMAL_MS
  }
}

/**
 * Starts a self-rescheduling background loop that periodically re-parses F1 data
 * from Jolpica. Guarded by a global so HMR / repeated calls don't stack timers.
 */
export function startF1Scheduler() {
  if (globalThis.__f1Scheduler?.running) return
  globalThis.__f1Scheduler = { running: true }

  const loop = async () => {
    try {
      await refresh()
    } catch {
      // Never let a transient failure kill the loop.
    }
    const delay = await nextDelay()
    globalThis.__f1Scheduler!.timer = setTimeout(loop, delay)
  }

  globalThis.__f1Scheduler.timer = setTimeout(loop, FIRST_RUN_MS)
}
