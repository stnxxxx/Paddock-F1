"use client"

import { useEffect, useRef, useState } from "react"
import type { LiveSnapshot } from "@/lib/f1/types"
import { api, type ApiStandings } from "@/lib/api"

export type TickerMode = "live" | "countdown" | "results" | "idle"

export interface LiveTickerData {
  mode: TickerMode
  snapshot: LiveSnapshot | null
  standings: ApiStandings | null
  loading: boolean
}

function deriveMode(snap: LiveSnapshot | null, standings: ApiStandings | null): TickerMode {
  const m = snap?.mode
  if (m === "live") return "live"
  if (m === "pre-session" || m === "countdown") return "countdown"
  if (m === "post-session") return "results"
  // delayed / fallback / no session — decide from how recent the last race was
  if (standings?.lastRace?.date) {
    const days = (Date.now() - new Date(standings.lastRace.date + "T23:59:59Z").getTime()) / 86400000
    if (days >= 0 && days <= 2) return "results"
  }
  return "idle"
}

async function fetchSnapshot(): Promise<LiveSnapshot | null> {
  try {
    const res = await fetch("/api/f1/live/current", { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as LiveSnapshot
  } catch {
    return null
  }
}

/**
 * Hybrid live data source for the header ticker.
 * - Opens the SSE stream ONLY while a session is live/imminent.
 * - Otherwise polls the lightweight snapshot endpoint once a minute.
 * This keeps a single connection per tab and avoids hammering the upstream
 * providers when nothing is happening.
 */
export function useLiveTicker(): LiveTickerData {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [standings, setStandings] = useState<ApiStandings | null>(null)
  const [loading, setLoading] = useState(true)
  const esRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSnapshot(), api.getStandings().catch(() => null)]).then(([snap, st]) => {
      if (cancelled) return
      setSnapshot(snap)
      setStandings(st)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Stream from OpenF1 only while a session is actually running. Before/after that we
  // rely on the lightweight poll to notice the transition into "live".
  const liveish = snapshot?.mode === "live"

  useEffect(() => {
    const closeES = () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
    const stopPoll = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    if (liveish) {
      stopPoll()
      if (!esRef.current) {
        const es = new EventSource("/api/f1/live/stream")
        es.addEventListener("snapshot", (e) => {
          try {
            setSnapshot(JSON.parse((e as MessageEvent).data) as LiveSnapshot)
          } catch {
            /* ignore malformed frame */
          }
        })
        // Browser auto-reconnects on error; if the session ends the next snapshot
        // flips `liveish` and this effect re-runs to fall back to polling.
        esRef.current = es
      }
    } else {
      closeES()
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          const snap = await fetchSnapshot()
          if (snap) setSnapshot(snap)
        }, 60_000)
      }
    }

    return () => {
      closeES()
      stopPoll()
    }
  }, [liveish])

  return { mode: deriveMode(snapshot, standings), snapshot, standings, loading }
}

/** Ticks every second and returns a formatted countdown to `targetMs`, or null when elapsed/absent. */
export function useCountdown(targetMs: number | null): string | null {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (targetMs == null) {
      setLabel(null)
      return
    }
    const pad = (n: number) => String(n).padStart(2, "0")
    const compute = () => {
      const diff = targetMs - Date.now()
      if (diff <= 0) {
        setLabel(null)
        return
      }
      const total = Math.floor(diff / 1000)
      const d = Math.floor(total / 86400)
      const h = Math.floor((total % 86400) / 3600)
      const m = Math.floor((total % 3600) / 60)
      const s = total % 60
      setLabel(d > 0 ? `${d}д ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`)
    }
    compute()
    const iv = setInterval(compute, 1000)
    return () => clearInterval(iv)
  }, [targetMs])

  return label
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}
