"use client"

import { Header } from "@/components/layout/header"
import { TeamMode } from "@/components/fantasy/team-mode"
import { PredictionMode } from "@/components/fantasy/prediction-mode"
import { FantasyHelp } from "@/components/fantasy/help-button"
import { cn } from "@/lib/utils"
import { Trophy, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function FantasyPage() {
  const [tab, setTab] = useState<"team" | "predict">("team")

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className={cn("mx-auto px-4", tab === "team" ? "max-w-[1040px]" : "max-w-[760px]")}>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl font-bold"><Zap className="h-5 w-5 text-[--gold]" /> Фэнтези</h1>
            <div className="flex items-center gap-2">
              <FantasyHelp />
              <Link href="/leaderboard" className="hidden items-center gap-1.5 text-xs font-medium text-[--text-muted] transition-colors hover:text-[--text-primary] sm:flex"><Trophy className="h-3.5 w-3.5" /> Лидерборд</Link>
            </div>
          </div>

          <div className="mb-5 inline-flex rounded-lg border border-[--border-default] bg-[--bg-surface] p-0.5 text-sm font-semibold">
            {([["team", "Команда"], ["predict", "Прогнозы"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn("rounded-md px-4 py-1.5 transition-colors", tab === k ? "text-white" : "text-[--text-muted] hover:text-[--text-primary]")}
                style={tab === k ? { backgroundColor: "var(--accent)" } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "team" ? <TeamMode /> : <PredictionMode />}
        </div>
      </main>
    </div>
  )
}
