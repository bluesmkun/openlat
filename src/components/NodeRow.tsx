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
    <div className="flex items-center gap-1.5" title={title}>
      <span className="w-7 shrink-0 text-[10px] leading-none text-muted-foreground">{label}</span>
      <span className="neu-inset h-1.5 w-12 shrink-0 overflow-hidden rounded-full">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-700",
            danger ? "bar-danger" : BAR_TONE[tone],
          )}
          style={{ width: `${filled}%` }}
        />
      </span>
      <span className="tnum w-9 shrink-0 text-right text-[11px] leading-none">{value}</span>
      <span className="tnum w-28 shrink-0 truncate text-[10px] leading-none text-muted-foreground">{detail}</span>
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
      {/* 名称列给固定宽度：宽度一旦随名称长短变化，后面各列的起点就会逐行错位。
          系统信息跟着名字走（第二行），不再单独占一列 */}
      <div className="flex w-44 min-w-0 shrink-0 flex-col justify-center gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot node={node} />
          <CountryLabel code={node.country} className="shrink-0" />
          <span className="truncate text-sm font-medium" title={node.name}>
            {node.name}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 pl-4 text-[10px] leading-none text-muted-foreground">
          <OsIcon os={node.os} className="size-4 rounded" />
          <span className="truncate" title={osText}>
            {osText}
          </span>
        </div>
      </div>

      {/* CPU / 内存 / 硬盘三行堆叠：核数、负载与真实用量都放在行内，和卡片视图同一套语义 */}
      <div className="hidden shrink-0 flex-col gap-1.5 md:flex">
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
        className="hidden w-36 shrink-0 lg:block xl:w-44"
        title={`本月已用 ${bytes(used)}${node.traffic_limit > 0 ? ` / ${bytes(node.traffic_limit)}` : " · 不限流量"}`}
      >
        <div className="flex items-baseline justify-between gap-2 text-[11px] leading-4">
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
              "tnum w-8 shrink-0 text-right text-xs font-semibold",
              trafficRisk === "bad" ? "text-destructive" : trafficRisk === "warn" ? "text-warn" : "text-foreground/85",
            )}
          >
            {trafficPct === null ? FOREVER : `${trafficPct.toFixed(0)}%`}
          </span>
        </div>
      </div>

      {/* 下行 / 上行 / TCP·UDP 三行与右侧标签对齐，连上行下行的标签都齐全 */}
      <div className="hidden w-28 shrink-0 flex-col gap-1.5 xl:flex">
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="shrink-0 text-[10px] text-muted-foreground">下行</span>
          <span className="tnum inline-flex min-w-0 items-center gap-1 text-[11px]">
            <ArrowDown className="size-3 shrink-0 text-info" />
            <span className="truncate">{m ? rate(m.net_rx) : "—"}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="shrink-0 text-[10px] text-muted-foreground">上行</span>
          <span className="tnum inline-flex min-w-0 items-center gap-1 text-[11px]">
            <ArrowUp className="size-3 shrink-0 text-chart-4" />
            <span className="truncate">{m ? rate(m.net_tx) : "—"}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="shrink-0 text-[10px] text-muted-foreground">TCP/UDP</span>
          <span className="tnum min-w-0 truncate text-[11px]">{m ? `${m.tcp} / ${m.udp}` : "—"}</span>
        </div>
      </div>

      <LatencyMini latency={latency} className="min-w-32 flex-1 sm:min-w-40" />

      {/* 到期与续费并成一组两行，标签在左、数值在右，与卡片上的处理一致 */}
      <div className="hidden w-28 shrink-0 flex-col gap-1.5 xl:flex">
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="shrink-0 text-[10px] text-muted-foreground">到期</span>
          <ExpiryText date={node.expires_at} compact className="min-w-0 truncate text-[11px] font-medium" />
        </div>
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="shrink-0 text-[10px] text-muted-foreground">续费</span>
          <span className="tnum min-w-0 truncate text-[11px]">
            <PriceText node={node} />
          </span>
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </div>
  )
}

/** 节点对象与延迟数据都没变时跳过重绘：2 秒一次的推送只更新真正变化的行 */
export const NodeRow = memo(NodeRowBase, (a, b) => a.node === b.node && a.latency === b.latency)
