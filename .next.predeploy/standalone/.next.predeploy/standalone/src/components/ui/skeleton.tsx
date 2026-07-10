import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-[--bg-elevated]", className)}
    />
  )
}

export function PostSkeleton() {
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-1.5" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[--border-default]">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  )
}
