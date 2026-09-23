import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** track = 微拟物凹陷轨道（主界面工具栏用）；default = 描边扁平（详情页用） */
export type SelectVariant = "default" | "track"

const VARIANTS: Record<SelectVariant, string> = {
  default:
    "h-8 border border-input bg-background/70 pr-7 pl-2.5 hover:border-primary/40 focus-visible:border-ring",
  track: "neu-track h-8 border pr-7 pl-2.5",
}

export function Select({
  className,
  children,
  variant = "default",
  ...props
}: React.ComponentProps<"select"> & { variant?: SelectVariant }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        className={cn(
          "cursor-pointer appearance-none rounded-lg text-xs text-foreground transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
          VARIANTS[variant],
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </div>
  )
}
