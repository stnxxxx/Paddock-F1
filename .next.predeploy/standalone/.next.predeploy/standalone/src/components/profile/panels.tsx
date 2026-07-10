import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Shared building blocks for profile-style pages (user, public, driver, team). */

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4", className)}>{children}</section>
}

export function SectionTitle({ icon: Icon, title, inline }: { icon: LucideIcon; title: string; inline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", !inline && "mb-3")}>
      <Icon className="h-4 w-4 text-[--accent]" />
      <h2 className="text-sm font-semibold text-[--text-primary]">{title}</h2>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-10 text-center text-sm text-[--text-muted]">{text}</div>
}

export function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="flex items-center gap-2 text-xs text-[--text-muted]">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
