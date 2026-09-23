import type { ReactNode } from "react"

import { BAR_TONE, type BarTone, type IconType } from "@/components/Bits"
import { cn } from "@/lib/utils"

type Props = {
  label: ReactNode
  icon?: IconType
  pct: number | null
  foot: ReactNode
  empty?: ReactNode
  tone?: BarTone
  className?: string
}

export function Meter({ label, icon: Icon, pct, foot, empty = "—", tone = "cpu", className }: Props) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  const danger = pct !== null && filled >= 90
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {Icon && <Icon className="size-3 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <span className={cn("tnum text-xs font-semibold", danger ? "text-destructive" : "text-foreground/85")}>
          {pct === null ? empty : `${filled < 10 ? filled.toFixed(1) : filled.toFixed(0)}%`}
        </span>
      </div>
      <div className="neu-inset mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", danger ? "bar-danger" : BAR_TONE[tone])}
          style={{ width: `${filled}%` }}
        />
      </div>
      <div className="tnum mt-1.5 truncate text-xs text-muted-foreground">{foot}</div>
    </div>
  )
}
