import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CalendarClock,
  Cpu,
  HardDrive,
  MemoryStick,
} from "lucide-react"

import { CountryLabel, ExpiryText, LatencyPanel, PriceText, StatusPill } from "@/components/Bits"
import { Meter } from "@/components/Meter"
import { Card } from "@/components/ui/card"
import type { Latency, Node } from "@/lib/api"
import { bytes, daysUntil, expiryRisk, FOREVER, osName, pair, percent, rate, type ExpiryRisk } from "@/lib/format"
import { cn } from "@/lib/utils"
import { deployed, monthUsage, statusOf } from "@/lib/view"

/** 到期风险只体现在文字颜色上，轨道底色保持固定，避免卡片里出现太多色块 */
const RISK_TEXT: Record<Exclude<ExpiryRisk, "none">, string> = {
  soon: "text-warn",
  critical: "text-destructive",
}

export function NodeCard({ node, latency, onOpen }: { node: Node; latency?: Latency; onOpen: () => void }) {
  const m = node.metrics
  const status = statusOf(node)
  const used = monthUsage(node)
  const trafficPct = node.traffic_limit > 0 ? percent(used, node.traffic_limit) : null
  const risk = expiryRisk(daysUntil(node.expires_at))

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className="glow-hover cv-card rise group relative min-w-0 cursor-pointer gap-0 overflow-hidden p-4 hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <span
        className={cn(
          "pointer-events-none absolute -top-16 -right-12 size-40 rounded-full blur-3xl",
          status === "online" ? "bg-ok/12" : status === "offline" ? "bg-destructive/10" : "bg-muted/40",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold break-words" title={node.name}>
            {node.name}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CountryLabel code={node.country} name className="min-w-0 shrink-0" />
            <span className="min-w-0 truncate">
              {node.os
                ? [osName(node.os), node.virt && node.virt !== "none" ? node.virt : "", node.arch]
                    .filter(Boolean)
                    .join(" · ")
                : "等待首次上报"}
            </span>
          </p>
        </div>
        <StatusPill node={node} className="shrink-0" />
      </div>

      {deployed(node) ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            <Meter
              icon={Cpu}
              tone="cpu"
              label={`CPU${node.cpu_cores ? ` ${node.cpu_cores} 核` : ""}`}
              pct={m ? m.cpu : null}
              foot={m ? m.load.map((n) => n.toFixed(2)).join(" ") : "—"}
            />
            <Meter
              icon={MemoryStick}
              tone="mem"
              label="内存"
              pct={m ? percent(m.mem_used, m.mem_total) : null}
              foot={m ? pair(m.mem_used, m.mem_total) : bytes(node.mem_total)}
            />
            <Meter
              icon={HardDrive}
              tone="disk"
              label="硬盘"
              pct={m ? percent(m.disk_used, m.disk_total) : null}
              foot={m ? pair(m.disk_used, m.disk_total) : bytes(node.disk_total)}
            />
            <Meter
              icon={ArrowDownUp}
              tone="net"
              label="流量"
              pct={trafficPct}
              empty={FOREVER}
              foot={node.traffic_limit > 0 ? pair(used, node.traffic_limit) : `${bytes(used)} / ${FOREVER}`}
            />
          </div>

          <div className="mt-4">
            <LatencyPanel latency={latency} />

            <div className="neu-track mt-2.5 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarClock className="size-3.5" />
                到期
              </span>
              <ExpiryText
                date={node.expires_at}
                className={cn("text-[13px] font-semibold", risk !== "none" && RISK_TEXT[risk])}
              />
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <dt className="shrink-0 text-muted-foreground">连接</dt>
                <dd className="tnum min-w-0 truncate" title="TCP / UDP 连接数">
                  {m ? `${m.tcp} / ${m.udp}` : "—"}
                </dd>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <dt className="shrink-0 text-muted-foreground">续费</dt>
                <dd className="min-w-0 truncate">
                  <PriceText node={node} />
                </dd>
              </div>
            </dl>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="neu-track flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <ArrowDown className="size-4 shrink-0 text-info" />
                  下行
                </span>
                <span className="tnum min-w-0 truncate text-[12px] font-semibold">{m ? rate(m.net_rx) : "—"}</span>
              </div>
              <div className="neu-track flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <ArrowUp className="size-4 shrink-0 text-chart-4" />
                  上行
                </span>
                <span className="tnum min-w-0 truncate text-[12px] font-semibold">{m ? rate(m.net_tx) : "—"}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          还没有接入。在后台生成安装命令并执行一次。
        </p>
      )}
    </Card>
  )
}
