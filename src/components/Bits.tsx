import { memo, useId, useState, type ComponentType, type ReactNode } from "react"
import { Activity } from "lucide-react"

import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { type Latency, type LatencyHour, type Node, type ProbeStat } from "@/lib/api"
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

type Pt = { x: number; y: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Catmull-Rom 平滑，控制点收紧到 1/6，曲线不会在尖峰外溢出太远 */
function waveLine(points: Pt[]): string {
  if (points.length === 0) return ""
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

const W = 100

const slotX = (i: number, count: number) => (count <= 1 ? W / 2 : (i * W) / (count - 1))

/** 12 小时延迟曲线：冷色渐变面积波，单独一条轨道，缺口如实断开，
 *  末格没有数据时以虚线标出「现在」 */
function LatencyCurve({
  hours,
  probes,
  compact = false,
  className,
}: {
  hours: LatencyHour[]
  probes: number
  compact?: boolean
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const H = compact ? 14 : 36
  const padY = compact ? 2 : 4
  const step = W / Math.max(hours.length, 1)
  const values = hours.map((h) => h.latency)
  const clean = values.filter((v): v is number => v !== null)
  const lo = clean.length > 0 ? Math.min(...clean) : 0
  const hi = clean.length > 0 ? Math.max(...clean) : 1
  const margin = Math.max((hi - lo) * 0.18, hi * 0.05, 1)
  const yMin = Math.max(0, lo - margin)
  const yMax = hi + margin
  const py = (v: number) => clamp(H - padY - ((v - yMin) / Math.max(yMax - yMin, 1)) * (H - padY * 2), padY, H - padY)

  const segments: Pt[][] = []
  let run: Pt[] = []
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length > 0) segments.push(run)
      run = []
    } else {
      run.push({ x: slotX(i, values.length), y: py(v) })
    }
  })
  if (run.length > 0) segments.push(run)

  const last = segments.length > 0 ? segments[segments.length - 1] : null
  const lastPt = last ? last[last.length - 1] : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("wave-cool block w-full", className)}
    >
      <defs>
        <linearGradient id={`lat-stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--wave-a)" }} />
          <stop offset="100%" style={{ stopColor: "var(--wave-b)" }} />
        </linearGradient>
        <linearGradient id={`lat-fill-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0%" style={{ stopColor: "var(--wave-fill)", stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: "var(--wave-fill)", stopOpacity: 0.02 }} />
        </linearGradient>
      </defs>

      <line
        x1="0"
        y1={H - 0.5}
        x2={W}
        y2={H - 0.5}
        className="stroke-border"
        strokeWidth="1"
        opacity="0.7"
        vectorEffect="non-scaling-stroke"
      />

      {segments.map((points, i) => {
        const d = waveLine(points)
        if (points.length === 1) {
          const x = clamp(points[0].x, 0.9, W - 0.9)
          return (
            <rect
              key={i}
              x={x - 0.9}
              y={points[0].y - 0.9}
              width="1.8"
              height="1.8"
              rx="0.9"
              fill={`url(#lat-stroke-${uid})`}
            />
          )
        }
        return (
          <g key={i}>
            <path
              d={`${d} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`}
              fill={`url(#lat-fill-${uid})`}
            />
            <path
              d={d}
              fill="none"
              stroke={`url(#lat-stroke-${uid})`}
              strokeWidth="4"
              strokeOpacity="0.16"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={d}
              fill="none"
              stroke={`url(#lat-stroke-${uid})`}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}

      {lastPt && lastPt.x < W - 0.5 && (
        <line
          x1={W - 0.3}
          y1={padY}
          x2={W - 0.3}
          y2={H - padY}
          stroke="var(--wave-b)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.4"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hours.map((hour, i) => (
        <rect key={i} x={slotX(i, hours.length) - step / 2} y="0" width={step} height={H} fill="transparent" pointerEvents="all">
          <title>
            {`${hourLabel(hour.ts)} · 延迟 ${
              hour.latency === null ? "无数据" : `${Math.round(hour.latency)} ms`
            }${probes > 1 ? `（${probes} 个探测均值）` : ""}`}
          </title>
        </rect>
      ))}
    </svg>
  )
}

/** 12 小时丢包竖条：暖色单独一条轨道，与冷色延迟曲线在颜色和形态上都不同，
 *  两者不会再混在一起 */
function LossBars({
  hours,
  probes,
  compact = false,
  className,
}: {
  hours: LatencyHour[]
  probes: number
  compact?: boolean
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const H = compact ? 10 : 16
  const padTop = compact ? 1.5 : 2.5
  const step = W / Math.max(hours.length, 1)
  const maxBar = H - padTop - 0.5

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block w-full", className)}
    >
      <defs>
        <linearGradient id={`loss-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1={H} x2="0" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--heat-hot)", stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: "var(--heat-bad)", stopOpacity: 0.95 }} />
        </linearGradient>
      </defs>

      <line
        x1="0"
        y1={H - 0.5}
        x2={W}
        y2={H - 0.5}
        className="stroke-border"
        strokeWidth="1"
        opacity="0.7"
        vectorEffect="non-scaling-stroke"
      />

      {hours.map((hour, i) => {
        if (hour.loss === null || hour.loss <= 0) return null
        const bar = Math.max(1.2, Math.min(hour.loss / 10, 1) * maxBar)
        return (
          <rect
            key={i}
            x={slotX(i, hours.length) - step * 0.27}
            y={H - bar}
            width={step * 0.54}
            height={bar}
            rx="0.5"
            fill={`url(#loss-${uid})`}
          />
        )
      })}

      {hours.map((hour, i) => (
        <rect key={i} x={slotX(i, hours.length) - step / 2} y="0" width={step} height={H} fill="transparent" pointerEvents="all">
          <title>
            {`${hourLabel(hour.ts)} · 丢包 ${hour.loss === null ? "无数据" : `${hour.loss.toFixed(1)}%`}${
              probes > 1 ? `（${probes} 个探测均值）` : ""
            }`}
          </title>
        </rect>
      ))}
    </svg>
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
          12 小时
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
          <LatencyCurve hours={hours} probes={probes.length} className="h-9 min-w-0 flex-1" />
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
          <LossBars hours={hours} probes={probes.length} className="h-4 min-w-0 flex-1" />
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
        <span>12 小时前</span>
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
      {/* 与卡片视图同一份 hours（多探测按小时求均值）与同一对组件，两个视图显示一致 */}
      <LatencyCurve hours={hours} probes={probes.length} compact className="h-3.5" />
      <LossBars hours={hours} probes={probes.length} compact className="h-2.5" />
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
