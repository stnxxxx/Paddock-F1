"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { track, trackPageview, initBehavior, resetScrollDepth } from "@/lib/analytics"
import { onConsentChange } from "@/lib/consent"

/** Mounted once globally. Records session start, page views per route, and (re)binds
 *  behavior listeners whenever consent changes. All calls no-op without consent. */
export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    track("session_start")
    initBehavior()
    return onConsentChange(() => { initBehavior() })
  }, [])

  useEffect(() => {
    resetScrollDepth()
    trackPageview()
  }, [pathname])

  return null
}
