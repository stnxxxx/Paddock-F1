import type { CSSProperties } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const FALLBACK_COLORS = [
  "#ff3b5f",
  "#25f4ee",
  "#7c5cff",
  "#ff8a3d",
  "#4da6ff",
  "#00a99d",
  "#f5c542",
]

function hashName(name: string) {
  return Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function getInitial(username?: string | null) {
  const first = Array.from((username || "").trim())[0]
  return first ? first.toLocaleUpperCase("ru-RU") : "?"
}

function fallbackStyle(username: string, color?: string): CSSProperties {
  const accent = color || FALLBACK_COLORS[hashName(username) % FALLBACK_COLORS.length]

  return {
    background:
      `radial-gradient(circle at 30% 20%, ${accent} 0%, ${accent} 20%, #1d1f27 58%, #090a0f 100%)`,
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 0 1px ${accent}26`,
  }
}

interface UserAvatarProps {
  username: string
  src?: string | null
  color?: string | null
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ username, src, color, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={cn("ring-1 ring-white/10 bg-[--bg-elevated]", className)}>
      {src ? (
        <AvatarImage src={src} alt={username} />
      ) : (
        <AvatarFallback
          className={cn("text-[0.72rem] font-black leading-none text-white", fallbackClassName)}
          style={fallbackStyle(username, color || undefined)}
        >
          {getInitial(username)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
