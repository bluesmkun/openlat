import * as React from "react"

import { cn } from "@/lib/utils"

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("neu flex flex-col rounded-2xl border text-card-foreground", className)}
      {...props}
    />
  )
}
