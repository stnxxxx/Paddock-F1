import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function TableRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-10 ml-auto" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-3 w-56" />
        </Card>
        <Card className="p-4">
          <Skeleton className="h-3 w-28 mb-3" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-2 w-full" />
        </Card>
      </div>
      <Card className="p-4">
        <Skeleton className="h-4 w-44 mb-4" />
        <Skeleton className="h-[280px] w-full" />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Skeleton className="h-4 w-32 mb-4" />
          <TableRows />
        </Card>
        <Card className="p-4">
          <Skeleton className="h-4 w-32 mb-4" />
          <TableRows />
        </Card>
      </div>
    </div>
  )
}
