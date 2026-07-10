import { hasConsent, getCookie, setCookie } from "./consent"

// Consent-gated UI preferences (e.g. last feed tab). Stored as first-party cookies
// only when the visitor allowed the "preferences" category.
const YEAR = 365 * 24 * 60 * 60

export function getPref(key: string): string | null {
  return getCookie("pa_pref_" + key)
}

export function setPref(key: string, value: string) {
  if (!hasConsent("preferences")) return
  setCookie("pa_pref_" + key, value, YEAR)
}
