"use client"

import type { ApiFantasyAsset } from "@/lib/api"
import { TeamLogo } from "@/components/ui/team-logo"
import { cn } from "@/lib/utils"
import { Star, X } from "lucide-react"

/** "Lewis Hamilton" → "L. HAMILTON"; constructors keep their name as-is. */
function displayName(asset: ApiFantasyAsset): string {
  if (asset.kind === "constructor") return asset.name
  const parts = asset.name.trim().split(/\s+/)
  if (parts.length < 2) return asset.name.toUpperCase()
  return `${parts[0][0]}. ${parts.slice(1).join(" ").toUpperCase()}`
}

function PriceDelta({ delta }: { delta: number }) {
  if (!delta) return <span className="text-[11px] text-[--text-placeholder]">—</span>
  const up = delta > 0
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", up ? "text-[#2e9bff]" : "text-[--destructive]")}>
      {up ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}M
    </span>
  )
}

interface AssetCardProps {
  asset: ApiFantasyAsset
  captain?: boolean
  /** Show the captain (C) toggle. */
  onCaptain?: () => void
  /** Show the remove (X) button. */
  onRemove?: () => void
  className?: string
}

/** A squad card mirroring the F1 Fantasy look: team-colour header with photo, name, price, price change. */
export function AssetCard({ asset, captain, onCaptain, onRemove, className }: AssetCardProps) {
  const color = asset.color || "#555"
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-elevated] shadow-sm", className)}>
      <div
        className={cn("relative flex items-end justify-center", asset.kind === "constructor" ? "h-[132px]" : "h-[112px]")}
        style={{ backgroundColor: color }}
      >
        {asset.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.image}
              alt={asset.name}
              title={asset.image_credit ? `Фото: ${asset.image_credit}` : undefined}
              className={cn("h-full w-full", asset.kind === "constructor" ? "object-contain p-3" : "object-cover object-top")}
            />
          </>
        ) : asset.kind === "constructor" ? (
          <>
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            <TeamLogo team={asset.name} size={50} className="relative" />
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white/90">
            {asset.ref}
          </span>
        )}

        {onCaptain && (
          <button
            onClick={onCaptain}
            title={captain ? "Капитан (×2)" : "Назначить капитаном"}
            className={cn(
              "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shadow transition-transform hover:scale-105",
              captain ? "bg-white text-black" : "bg-black/45 text-white"
            )}
          >
            {captain ? <Star className="h-3.5 w-3.5 fill-current" /> : "C"}
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label="Убрать"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow transition-transform hover:scale-105"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="truncate text-[13px] font-bold text-[--text-primary]">{displayName(asset)}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[13px] font-semibold tabular-nums text-[--text-secondary]">${asset.price.toFixed(1)}M</span>
          <PriceDelta delta={asset.price_delta} />
        </div>
      </div>
    </div>
  )
}

/** Empty slot placeholder with an "add" affordance. */
export function EmptySlot({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[170px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[--border-default] bg-[--bg-surface] text-[--text-muted] transition-colors hover:border-[--accent] hover:text-[--text-primary]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}
