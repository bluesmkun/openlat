import * as React from "react"

import { cn } from "@/lib/utils"

export type BadgeVariant = "primary" | "outline" | "muted" | "ok" | "warn" | "danger" | "info"

const VARIANTS: Record<BadgeVariant, string> = {
  primary: "border-primary/25 bg-primary/12 text-primary",
  outline: "border-border bg-card/50 text-muted-foreground",
  muted: "border-transparent bg-muted text-muted-foreground",
  ok: "border-ok/25 bg-ok/12 text-ok",
  warn: "border-warn/30 bg-warn/12 text-warn",
  danger: "border-destructive/25 bg-destructive/12 text-destructive",
  info: "border-info/25 bg-info/12 text-info",
}

export function Badge({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
