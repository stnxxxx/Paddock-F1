// Client-side cookie-consent state. The consent record itself is a strictly-necessary
// cookie (it stores the user's choice), so it is always allowed. Everything else is gated.

export type ConsentCategory = "analytics" | "preferences" | "behavior"

export interface Consent {
  analytics: boolean
  preferences: boolean
  behavior: boolean
}

const COOKIE = "paddock_consent"
const VERSION = 1
const MAX_AGE = 365 * 24 * 60 * 60

export const CONSENT_CHANGE_EVENT = "paddock-consent-change"
export const OPEN_CONSENT_EVENT = "paddock-open-consent"

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const entry = document.cookie.split(/;\s*/).find((c) => c.startsWith(name + "="))
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null
}

export function setCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; Max-Age=0; Path=/`
}

/** Returns the saved choice, or null if the visitor hasn't decided yet. */
export function readConsent(): Consent | null {
  const raw = getCookie(COOKIE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.v !== VERSION) return null
    return { analytics: !!parsed.analytics, preferences: !!parsed.preferences, behavior: !!parsed.behavior }
  } catch {
    return null
  }
}

export function saveConsent(c: Consent) {
  setCookie(COOKIE, JSON.stringify({ v: VERSION, ...c, ts: Date.now() }), MAX_AGE)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: c }))
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return !!readConsent()?.[category]
}

/** Subscribe to consent changes; returns an unsubscribe function. */
export function onConsentChange(cb: (c: Consent) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const handler = (e: Event) => cb((e as CustomEvent<Consent>).detail)
  window.addEventListener(CONSENT_CHANGE_EVENT, handler)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler)
}

/** Re-open the consent banner (e.g. from a "Cookie settings" link). */
export function openConsentSettings() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))
}
