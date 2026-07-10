"use client"

import * as React from "react"
import { Root, Indicator } from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }: React.ComponentProps<typeof Root>) {
  return (
    <Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[--primary]/20", className)}
      {...props}
    >
      <Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-[--primary] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </Root>
  )
}

export { Progress }
