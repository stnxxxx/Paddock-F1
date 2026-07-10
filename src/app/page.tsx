"use client"

import { Header } from "@/components/layout/header"
import { Feed } from "@/components/layout/feed"
import { Sidebar } from "@/components/layout/sidebar"
import { InterestPicker } from "@/components/onboarding/interest-picker"
import { openConsentSettings } from "@/lib/consent"
import { Suspense, useCallback, useState } from "react"

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [focusCreate, setFocusCreate] = useState(false)

  const handleNewPost = useCallback(() => {
    setFocusCreate(true)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        onNewPost={handleNewPost}
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        showTicker
      />
      <div className="flex-1 flex max-w-[1280px] mx-auto w-full">
        <Suspense fallback={<main className="flex-1 min-w-0 py-5 text-center text-sm text-[--text-muted]">Загрузка ленты...</main>}>
          <Feed
            searchQuery={searchQuery}
            focusCreate={focusCreate}
            onFocusDone={() => setFocusCreate(false)}
          />
        </Suspense>
        <Sidebar />
      </div>
      <footer className="border-t border-[--border-default] mt-auto">
        <div className="max-w-[1280px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="font-display text-xs font-bold tracking-[0.12em] text-[--text-primary]">PADDOCK</span>
            <span className="text-[--text-muted]">Экосистема Формулы 1 · сезон 2026</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openConsentSettings} className="text-[11px] text-[--text-muted] transition-colors hover:text-[--text-primary]">Настройки cookie</button>
            <span className="text-[11px] text-[--text-muted]">Данные: Jolpica API и OpenF1</span>
          </div>
        </div>
      </footer>
      <InterestPicker />
    </div>
  )
}
