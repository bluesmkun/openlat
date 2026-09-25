import { memo } from "react"
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react"

import {
  BAR_TONE,
  CountryLabel,
  ExpiryText,
  LatencyMini,
  OsIcon,
  PriceText,
  StatusDot,
  type BarTone,
} from "@/components/Bits"
import type { Latency, Node } from "@/lib/api"
import { bytes, FOREVER, osName, pair, percent, rate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { monthUsage } from "@/lib/view"

/**
 * 列表行用同一套 grid-template-columns 而不是「固定宽度 + flex-1 吸收余量」：
 * 列宽按权重分配，延迟列因此只拿约 0.85 份，24 格色块不会被撑成长条，
 * 各行的列起点、列终点也天然对齐。被 hidden 掉的格子不占位，
 * 每一档断点的列数刚好和可见的格子数对上：
 *
 *   base 1 列（节点在上、资源在下）→ sm 2 列 → md 3 列（+延迟）
 *   → lg 5 列（+流量 +网络）→ xl 6 列（+到期费用）
 */
const ROW_GRID = cn(
  "grid items-center gap-x-4 gap-y-1.5",
  "grid-cols-1",
  "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]",
  "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]",
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.85fr)]",
  "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.85fr)_minmax(0,0.7fr)]",
)

/** CPU / 内存 / 硬盘的最上面一行：标签 + 凹陷轨道 + 百分比 + 真实用量，三行堆叠对齐 */
function HardRow({
  label,
  tone,
  pct,
  value,
  detail,
  title,
}: {
  label: string
  tone: BarTone
  pct: number | null
  value: string
  detail: string
  title?: string
}) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  const danger = pct !== null && filled >= 90
  return (
    <div className="flex items-center gap-2" title={title}>
      <span className="w-7 shrink-0 text-[10px] leading-none text-muted-foreground">{label}</span>
      <span className="neu-inset h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-700",
            danger ? "bar-danger" : BAR_TONE[tone],
          )}
          style={{ width: `${filled}%` }}
        />
      </span>
      <span className="tnum w-8 shrink-0 text-right text-[10px] leading-none">{value}</span>
      <span className="tnum w-[6.75rem] shrink-0 truncate text-right text-[10px] leading-none text-muted-foreground">
        {detail}
      </span>
    </div>
  )
}

function NodeRowBase({ node, latency, onOpen }: { node: Node; latency?: Latency; onOpen: () => void }) {
  const m = node.metrics
  const used = monthUsage(node)
  const trafficPct = node.traffic_limit > 0 ? percent(used, node.traffic_limit) : null
  const trafficRisk = trafficPct !== null && trafficPct >= 90 ? "bad" : trafficPct !== null && trafficPct >= 75 ? "warn" : "ok"
  const memPct = m ? percent(m.mem_used, m.mem_total) : null
  const diskPct = m ? percent(m.disk_used, m.disk_total) : null
  const osText = node.os
    ? [osName(node.os), node.virt && node.virt !== "none" ? node.virt : "", node.arch].filter(Boolean).join(" · ")
    : "等待首次上报"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className="glow-hover cv-row group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border neu-row px-3 py-2.5 hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <div className={cn(ROW_GRID, "min-w-0 flex-1")}>
        {/* 节点：两行，系统信息跟着名字走 */}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <StatusDot node={node} />
            <CountryLabel code={node.country} className="shrink-0" />
            <span className="truncate text-sm font-medium" title={node.name}>
              {node.name}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-4 text-[10px] leading-none text-muted-foreground">
            <OsIcon os={node.os} className="size-4 rounded" />
            <span className="truncate" title={osText}>
              {osText}
            </span>
          </div>
        </div>

        {/* CPU / 内存 / 硬盘三行堆叠：核数、负载与真实用量都放在行内，和卡片视图同一套语义 */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <HardRow
            label="CPU"
            tone="cpu"
            pct={m ? m.cpu : null}
            value={m ? `${m.cpu.toFixed(0)}%` : "—"}
            detail={
              m
                ? `${node.cpu_cores ? `${node.cpu_cores} 核 · ` : ""}负载 ${m.load[0].toFixed(2)}`
                : node.cpu_cores
                  ? `${node.cpu_cores} 核`
                  : "—"
            }
            title={m ? `负载 ${m.load.map((n) => n.toFixed(2)).join(" / ")}` : undefined}
          />
          <HardRow
            label="内存"
            tone="mem"
            pct={memPct}
            value={memPct === null ? "—" : `${memPct.toFixed(0)}%`}
            detail={m ? pair(m.mem_used, m.mem_total) : bytes(node.mem_total)}
          />
          <HardRow
            label="硬盘"
            tone="disk"
            pct={diskPct}
            value={diskPct === null ? "—" : `${diskPct.toFixed(0)}%`}
            detail={m ? pair(m.disk_used, m.disk_total) : bytes(node.disk_total)}
          />
        </div>

        <div
          className="hidden min-w-0 lg:block"
          title={`本月已用 ${bytes(used)}${node.traffic_limit > 0 ? ` / ${bytes(node.traffic_limit)}` : " · 不限流量"}`}
        >
          <div className="flex items-baseline justify-between gap-2 text-[10px] leading-4">
            <span className="shrink-0 text-muted-foreground">流量</span>
            <span className="tnum min-w-0 truncate text-muted-foreground">
              {bytes(used)} / {node.traffic_limit > 0 ? bytes(node.traffic_limit) : FOREVER}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="neu-inset h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-700",
                  trafficRisk === "bad" ? "bar-danger" : "bar-net",
                )}
                style={{ width: `${trafficPct ?? 0}%` }}
              />
            </span>
            <span
              className={cn(
                "tnum w-8 shrink-0 text-right text-[10px] font-semibold",
                trafficRisk === "bad" ? "text-destructive" : trafficRisk === "warn" ? "text-warn" : "text-foreground/85",
              )}
            >
              {trafficPct === null ? FOREVER : `${trafficPct.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* 网络：上下行 + TCP/UDP，三行 */}
        <div className="hidden min-w-0 flex-col gap-1.5 lg:flex">
          <div className="flex items-center justify-between gap-2 leading-none">
            <span className="shrink-0 text-[10px] text-muted-foreground">下行</span>
            <span className="tnum inline-flex min-w-0 items-center gap-1 text-[10px]">
              <ArrowDown className="size-3 shrink-0 text-info" />
              <span className="truncate">{m ? rate(m.net_rx) : "—"}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 leading-none">
            <span className="shrink-0 text-[10px] text-muted-foreground">上行</span>
            <span className="tnum inline-flex min-w-0 items-center gap-1 text-[10px]">
              <ArrowUp className="size-3 shrink-0 text-chart-4" />
              <span className="truncate">{m ? rate(m.net_tx) : "—"}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 leading-none">
            <span className="shrink-0 text-[10px] text-muted-foreground">TCP / UDP</span>
            <span className="tnum min-w-0 truncate text-[10px]">{m ? `${m.tcp} / ${m.udp}` : "—"}</span>
          </div>
        </div>

        {/* 延迟色带：与卡片视图同一个组件、同一份多探测聚合数据 */}
        <div className="hidden min-w-0 md:block">
          <LatencyMini latency={latency} />
        </div>

        {/* 到期 / 费用 */}
        <div className="hidden min-w-0 flex-col gap-1.5 xl:flex">
          <div className="flex items-center justify-between gap-2 leading-none">
            <span className="shrink-0 text-[10px] text-muted-foreground">到期</span>
            <ExpiryText date={node.expires_at} compact className="min-w-0 truncate text-[10px] font-medium" />
          </div>
          <div className="flex items-center justify-between gap-2 leading-none">
            <span className="shrink-0 text-[10px] text-muted-foreground">续费</span>
            <span className="tnum min-w-0 truncate text-[10px]">
              <PriceText node={node} />
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </div>
  )
}

/** 节点对象与延迟数据都没变时跳过重绘：2 秒一次的推送只更新真正变化的行 */
export const NodeRow = memo(NodeRowBase, (a, b) => a.node === b.node && a.latency === b.latency)
