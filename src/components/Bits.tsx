import { memo, useState, type ComponentType, type ReactNode } from "react"
import { Activity, LayoutGrid, Server, SquareTerminal } from "lucide-react"

import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { HOUR_BUCKETS, type Latency, type LatencyHour, type Node, type ProbeStat } from "@/lib/api"
import { OS_ICONS } from "@/lib/os-icons"
import {
  countryName,
  CYCLES,
  daysUntil,
  duration,
  expiryLabel,
  expiryTone,
  flagOf,
  jitterTone,
  latencyTone,
  money,
  osName,
  uptime,
  type Tone,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { statusOf } from "@/lib/view"

export type IconType = ComponentType<{ className?: string }>

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-destructive",
  muted: "text-muted-foreground",
}

export const TONE_BADGE: Record<Tone, BadgeVariant> = {
  ok: "ok",
  warn: "warn",
  bad: "danger",
  muted: "muted",
}

export const BAR_TONE = {
  cpu: "bar-cpu",
  mem: "bar-mem",
  disk: "bar-disk",
  net: "bar-net",
} as const

export type BarTone = keyof typeof BAR_TONE

export function statusLabel(node: Node): string {
  const status = statusOf(node)
  if (status === "online") return node.metrics ? `在线 ${uptime(node.metrics.uptime)}` : "在线"
  if (status === "offline") {
    return node.last_seen ? `离线 ${duration(Math.max(0, Date.now() / 1000 - node.last_seen))}` : "离线"
  }
  return "未接入"
}

export function StatusDot({ node, className }: { node: Node; className?: string }) {
  const status = statusOf(node)
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "online" ? "bg-ok pulse-ok" : status === "offline" ? "bg-destructive/80" : "bg-muted-foreground/40",
        className,
      )}
    />
  )
}

export function StatusPill({ node, className }: { node: Node; className?: string }) {
  const status = statusOf(node)
  return (
    <Badge
      variant={status === "online" ? "ok" : status === "offline" ? "danger" : "muted"}
      className={cn("py-1 font-normal", className)}
    >
      <StatusDot node={node} />
      {statusLabel(node)}
    </Badge>
  )
}

let flagSupport: boolean | null = null

export function flagsSupported(): boolean {
  if (flagSupport !== null) return flagSupport
  try {
    const size = 32
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      flagSupport = false
      return flagSupport
    }
    ctx.font = "24px sans-serif"
    ctx.textBaseline = "top"
    ctx.fillStyle = "#000"
    ctx.fillText("\u{1F1EF}\u{1F1F5}", 1, 1)
    const data = ctx.getImageData(0, 0, size, size).data
    let colored = 0
    for (let i = 0; i < data.length; i += 4) {
      const spread = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
      if (data[i + 3] > 0 && spread > 30) colored++
    }
    flagSupport = colored > 4
  } catch {
    flagSupport = false
  }
  return flagSupport
}

const FLAG_ICON = (code: string) =>
  `https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/${code.toLowerCase()}.svg`

export function FlagIcon({ code, className }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const c = code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(c) || failed) {
    return (
      <span
        className={cn(
          "rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground",
          className,
        )}
        title={countryName(code)}
      >
        {c || "??"}
      </span>
    )
  }
  return (
    <img
      src={FLAG_ICON(c)}
      alt={countryName(c)}
      width={16}
      height={12}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-3 w-4 shrink-0 rounded-[2px] object-cover shadow-sm", className)}
    />
  )
}

export function CountryLabel({ code, name = false, className }: { code: string; name?: boolean; className?: string }) {
  if (!code) return null
  const flag = flagOf(code)
  const emoji = flag !== "" && flagsSupported()
  if (!emoji && !name) return <FlagIcon code={code} className={className} />
  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground", className)}
      title={countryName(code)}
    >
      {emoji ? <span aria-hidden>{flag}</span> : <FlagIcon code={code} />}
      {name && <span className="max-w-24 truncate">{countryName(code)}</span>}
    </span>
  )
}

/** 发行版识别：具体发行版在前，通用 Unix / Windows 在后 */
const OS_MATCHERS: [RegExp, string][] = [
  [/debian/i, "debian"],
  [/ubuntu/i, "ubuntu"],
  [/centos/i, "centos"],
  [/alma/i, "almalinux"],
  [/rocky/i, "rockylinux"],
  [/fedora/i, "fedora"],
  [/arch/i, "archlinux"],
  [/alpine/i, "alpinelinux"],
  [/suse|sles/i, "opensuse"],
  [/gentoo/i, "gentoo"],
  [/openwrt/i, "openwrt"],
  [/freebsd/i, "freebsd"],
  [/red ?hat|rhel/i, "redhat"],
  [/mac|darwin|ios|os x/i, "apple"],
]

/** 列表视图的系统列：只画对应发行版 / 系统的图标，完整版本名放进 title，
 *  省下整列文字宽度；认不出的系统退回落格或终端图标 */
export function OsIcon({ os, className }: { os: string; className?: string }) {
  const label = os ? osName(os) : "等待首次上报"
  const path = OS_ICONS[OS_MATCHERS.find(([re]) => re.test(label))?.[1] ?? ""] ?? null
  return (
    <span
      title={label}
      className={cn("grid size-5 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground", className)}
    >
      {path ? (
        <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-current">
          <path d={path} />
        </svg>
      ) : /windows|wsl/i.test(label) ? (
        <LayoutGrid className="size-3" />
      ) : /linux|unix|bsd/i.test(label) ? (
        <SquareTerminal className="size-3" />
      ) : (
        <Server className="size-3" />
      )}
    </span>
  )
}

export function bandProbe(latency?: Latency): ProbeStat | null {
  if (!latency || latency.none || latency.failed) return null
  return latency.probes.find((p) => p.latency !== null) ?? null
}

export function latencyText(latency?: Latency): { text: string; tone: Tone } {
  if (!latency || latency.none || latency.failed) return { text: "—", tone: "muted" }
  const probe = bandProbe(latency)
  if (!probe || probe.latency === null || probe.min === null || probe.max === null) {
    return { text: "超时", tone: "bad" }
  }
  const low = Math.round(probe.min)
  const high = Math.round(probe.max)
  const spread = Math.round((probe.max - probe.min) / 2)
  const text = low === high ? `${Math.round(probe.latency)} ms` : `${low}–${high} ms${spread > 0 ? ` ±${spread}` : ""}`
  return { text, tone: latencyTone(probe.latency, probe.loss) }
}

const HEAT_TEXT = {
  ok: "text-ok",
  mild: "text-ok",
  warn: "text-warn",
  hot: "text-chart-4",
  bad: "text-destructive",
  muted: "text-muted-foreground",
} as const

type Heat = keyof typeof HEAT_TEXT

function heatOf(value: number | null, kind: "latency" | "loss"): Heat {
  if (value === null) return "muted"
  if (kind === "latency") {
    return value < 60 ? "ok" : value < 110 ? "mild" : value < 180 ? "warn" : value < 280 ? "hot" : "bad"
  }
  return value < 0.5 ? "ok" : value < 2 ? "mild" : value < 5 ? "warn" : value < 10 ? "hot" : "bad"
}

function hourLabel(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit" })
}

export type TrackKind = "latency" | "loss"

const TRACK: Record<TrackKind, string> = {
  latency: "延迟",
  loss: "丢包",
}

const HEAT_BLOCKS: Record<Heat, string> = {
  ok: "heat-ok",
  mild: "heat-mild",
  warn: "heat-warn",
  hot: "heat-hot",
  bad: "heat-bad",
  muted: "heat-muted",
}

/** 24 小时热力色块：每小时一格小圆角方块，延迟与丢包各自一条轨道，
 *  每 6 格留一道空隙区分时段；色块带微拟物的高光与投影，没有数据的格子凹陷留白 */
function HeatTrack({
  hours,
  kind,
  probes,
  compact = false,
  className,
}: {
  hours: LatencyHour[]
  kind: TrackKind
  probes: number
  compact?: boolean
  className?: string
}) {
  const cell = cn("min-w-0 flex-1", compact ? "heat-cell-flat rounded-[2px]" : "heat-cell rounded-[3px]")
  const gap = (i: number) => (i > 0 && i % 6 === 0 ? (compact ? "ml-[2px]" : "ml-[3px]") : "")
  return (
    <span className={cn("flex min-w-0 items-stretch", compact ? "gap-[1px]" : "gap-[1.5px]", className)}>
      {hours.length > 0
        ? hours.map((hour, i) => {
            const value = kind === "latency" ? hour.latency : hour.loss
            return (
              <span
                key={i}
                title={`${hourLabel(hour.ts)} · ${TRACK[kind]} ${
                  value === null ? "无数据" : kind === "latency" ? `${Math.round(value)} ms` : `${value.toFixed(1)}%`
                }${probes > 1 ? `（${probes} 个探测均值）` : ""}`}
                className={cn(cell, gap(i), HEAT_BLOCKS[heatOf(value, kind)])}
              />
            )
          })
        : // 没有探测数据时也铺满 24 格空槽，卡片行高与有数据的节点完全一致
          Array.from({ length: HOUR_BUCKETS }, (_, i) => (
            <span key={i} className={cn(cell, gap(i), HEAT_BLOCKS.muted)} />
          ))}
    </span>
  )
}

export const LatencyPanel = memo(function LatencyPanel({ latency, className }: { latency?: Latency; className?: string }) {
  const probes = latency?.probes ?? []
  const hours = latency?.hours ?? []
  const failed = latency?.failed === true
  const avgLatency = latency?.avgLatency ?? null
  const avgLoss = latency?.avgLoss ?? null
  const jitter = latency?.jitter ?? null

  return (
    <div className={cn("neu-inset relative overflow-hidden rounded-xl px-3 py-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Activity className="size-3.5" />
          24 小时
        </span>
        <span
          className="tnum shrink-0 truncate text-[10px] text-muted-foreground"
          title={failed ? undefined : probes.map((p) => p.name).join("、")}
        >
          {failed ? (
            <span className="text-destructive">读取失败</span>
          ) : (
            <>
              {jitter !== null && (
                <>
                  <span className={TONE_TEXT[jitterTone(jitter)]}>波动 {Math.round(jitter)}ms</span>
                  {probes.length > 0 && " · "}
                </>
              )}
              {probes.length > 0 && `${probes.length} 个探测`}
            </>
          )}
        </span>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-7 shrink-0 text-[10px] leading-none text-muted-foreground">延迟</span>
          <HeatTrack hours={hours} kind="latency" probes={probes.length} className="h-2.5 min-w-0 flex-1" />
          <span
            className={cn(
              "tnum w-12 shrink-0 text-right text-[10px] leading-none",
              HEAT_TEXT[heatOf(avgLatency, "latency")],
            )}
          >
            {avgLatency === null ? "—" : `${Math.round(avgLatency)}ms`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-7 shrink-0 text-[10px] leading-none text-muted-foreground">丢包</span>
          <HeatTrack hours={hours} kind="loss" probes={probes.length} className="h-2.5 min-w-0 flex-1" />
          <span
            className={cn(
              "tnum w-12 shrink-0 text-right text-[10px] leading-none",
              HEAT_TEXT[heatOf(avgLoss, "loss")],
            )}
          >
            {avgLoss === null ? "—" : `${avgLoss.toFixed(1)}%`}
          </span>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between pl-9 pr-14 text-[9px] text-muted-foreground/50">
        <span>24 小时前</span>
        <span>现在</span>
      </div>
    </div>
  )
})

export function LatencyMini({ latency, className }: { latency?: Latency; className?: string }) {
  const best = latencyText(latency)
  const hours = latency?.hours ?? []
  const probes = latency?.probes ?? []
  const avgLoss = latency?.avgLoss ?? null
  return (
    <span className={cn("flex min-w-0 flex-col justify-center gap-1", className)}>
      {/* 与卡片视图同一份 hours（多探测按小时求均值）与同一个热力色块组件，两个视图显示一致 */}
      <HeatTrack hours={hours} kind="latency" probes={probes.length} compact className="h-2" />
      <HeatTrack hours={hours} kind="loss" probes={probes.length} compact className="h-2" />
      <span className="flex min-w-0 items-center justify-between gap-2 text-[10px] leading-none whitespace-nowrap">
        <span className={cn("tnum truncate", TONE_TEXT[best.tone])}>{best.text}</span>
        <span className={cn("tnum shrink-0", HEAT_TEXT[heatOf(avgLoss, "loss")])}>
          {avgLoss === null ? "丢 —" : `丢 ${avgLoss.toFixed(1)}%`}
        </span>
      </span>
    </span>
  )
}

export function ExpiryText({
  date,
  compact = false,
  className,
}: {
  date?: string | null
  compact?: boolean
  className?: string
}) {
  const days = daysUntil(date)
  if (days === null) {
    return (
      <span className={cn("tnum text-muted-foreground", className)} title="永不到期">
        ∞
      </span>
    )
  }
  return (
    <span className={cn("tnum", TONE_TEXT[expiryTone(days)], className)} title={date ?? "永不到期"}>
      {compact ? (days < 0 ? `过期${-days}天` : `${days}天`) : expiryLabel(days)}
    </span>
  )
}

export function PriceText({ node, className }: { node: Node; className?: string }) {
  if (node.price <= 0) return <span className={cn("text-muted-foreground", className)}>免费</span>
  const cycle = CYCLES[node.billing_cycle] ?? node.billing_cycle
  return (
    <span className={cn("tnum", className)}>
      {money(node.price, node.currency)}
      {cycle && <span className="text-muted-foreground"> / {cycle}</span>}
    </span>
  )
}

export function Chip({
  icon: Icon,
  children,
  tone = "muted",
  title,
  className,
}: {
  icon?: IconType
  children: ReactNode
  tone?: Tone
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/70 px-2 py-1 text-xs", className)}
    >
      {Icon && <Icon className={cn("size-3.5 shrink-0", TONE_TEXT[tone])} />}
      <span className="truncate">{children}</span>
    </span>
  )
}

export function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
  className,
}: {
  icon: IconType
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: "primary" | "info" | Tone
  className?: string
}) {
  return (
    <div className={cn("rise flex min-w-0 items-center gap-3 rounded-2xl border neu p-3.5", className)}>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          tone === "primary"
            ? "bg-primary/12 text-primary"
            : tone === "info"
              ? "bg-info/12 text-info"
              : cn("bg-muted", TONE_TEXT[tone]),
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="tnum truncate text-base font-semibold">{value}</div>
        {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
}

export function MiniBar({
  label,
  pct,
  tone,
  value,
  className,
}: {
  label: string
  pct: number | null
  tone: BarTone
  value: string
  className?: string
}) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  const danger = pct !== null && filled >= 90
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="w-7 text-[11px] text-muted-foreground">{label}</span>
      <span className="neu-inset h-1.5 w-12 overflow-hidden rounded-full">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-700", danger ? "bar-danger" : BAR_TONE[tone])}
          style={{ width: `${filled}%` }}
        />
      </span>
      <span className="tnum w-9 text-right text-xs">{value}</span>
    </div>
  )
}
