import { hasConsent, getCookie, setCookie } from "./consent"

const YEAR = 365 * 24 * 60 * 60
const SESSION = 30 * 60 // 30-minute sliding window

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function visitorId(): string | null {
  if (!hasConsent("analytics")) return null
  let v = getCookie("pa_vid")
  if (!v) { v = uid(); setCookie("pa_vid", v, YEAR) }
  return v
}

function sessionId(): string | null {
  if (!hasConsent("analytics")) return null
  const v = getCookie("pa_sid") || uid()
  setCookie("pa_sid", v, SESSION) // refresh expiry on every event = sliding session
  return v
}

interface QueuedEvent {
  type: string
  path: string
  referrer: string
  vid: string | null
  sid: string | null
  data?: unknown
}

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function flush() {
  timer = null
  if (!queue.length) return
  const events = queue
  queue = []
  try {
    const body = JSON.stringify({ events })
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
    } else {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {})
    }
  } catch {
    // analytics is best-effort; never throw into the app
  }
}

export function track(type: string, data?: unknown) {
  if (typeof window === "undefined" || !hasConsent("analytics")) return
  queue.push({
    type,
    path: location.pathname + location.search,
    referrer: document.referrer || "",
    vid: visitorId(),
    sid: sessionId(),
    data,
  })
  if (!timer) timer = setTimeout(flush, 1500)
}

export function trackPageview() {
  track("pageview")
}

// ── Behavior tracking (requires "behavior" consent) ──────────────────────────
let behaviorBound = false
let maxScroll = 0

function onScroll() {
  const el = document.documentElement
  const denom = el.scrollHeight - el.clientHeight || 1
  const pct = Math.round(Math.min(1, Math.max(0, el.scrollTop / denom)) * 100)
  if (pct >= maxScroll + 25) { maxScroll = pct; track("scroll", { depth: pct }) }
}

function onClick(e: MouseEvent) {
  const target = (e.target as HTMLElement)?.closest?.("a,button")
  if (!target) return
  const label = (target.getAttribute("aria-label") || target.textContent || "").trim().slice(0, 60)
  track("click", { tag: target.tagName.toLowerCase(), label })
}

export function initBehavior() {
  if (behaviorBound || typeof window === "undefined" || !hasConsent("behavior")) return
  behaviorBound = true
  window.addEventListener("scroll", onScroll, { passive: true })
  document.addEventListener("click", onClick, true)
}

export function resetScrollDepth() {
  maxScroll = 0
}

// Flush any queued events when the tab is hidden/closed.
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush() })
}
