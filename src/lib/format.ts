import type { Node } from "./api.ts"

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"]

const unitOf = (n: number) => Math.min(Math.floor(Math.log(n) / Math.log(1024)), UNITS.length - 1)

export function bytes(n: number, digits?: number): string {
  if (!n || n < 1) return "0 B"
  const i = unitOf(n)
  const v = n / 1024 ** i
  return `${v.toFixed(i === 0 ? 0 : (digits ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2)))} ${UNITS[i]}`
}

export function pair(used: number, total: number): string {
  if (used > 0 && total > 0 && unitOf(used) === unitOf(total)) {
    const i = unitOf(total)
    const f = (n: number) => (n / 1024 ** i).toFixed(i === 0 ? 0 : 2)
    return `${f(used)} / ${f(total)} ${UNITS[i]}`
  }
  return `${bytes(used)} / ${bytes(total)}`
}

export function axisBytes(v: number): string {
  if (!v || v < 0) return "0 B"
  const unit = Math.min(Math.floor(Math.log(v) / Math.log(1024)), 5)
  return bytes(v, v / 1024 ** unit >= 100 ? 0 : 1).replace(".0 ", " ")
}

export function rate(n: number): string {
  return `${bytes(n, 1)}/s`
}

export function percent(used: number, total: number): number {
  return total > 0 ? Math.min(100, (used / total) * 100) : 0
}

export function duration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d} 天 ${h} 小时` : h > 0 ? `${h} 小时 ${m} 分` : `${m} 分`
}

export function uptime(seconds: number): string {
  return seconds > 0 ? duration(seconds) : "—"
}

export function daysUntil(date?: string | null): number | null {
  if (!date) return null
  const target = new Date(`${date}T00:00:00`).getTime()
  if (Number.isNaN(target)) return null
  return Math.ceil((target - Date.now()) / 86400000)
}

/** 剩余天数：优先用 hub 算好的 expires_in（在线节点按 hub 时区顺延，访客时钟无关），
 *  expires_in 为 null 表示没有到期日；旧版 hub 没有这个 key 才退回浏览器时钟 */
export function expiryDays(node: Node): number | null {
  if (node.expires_in !== undefined) return node.expires_in
  return daysUntil(node.expires_at)
}

/** 距最后一次上报的秒数：优先用 hub 的 last_seen_ago（访客时钟不准也不出错），
 *  旧版 hub 没有这个 key 才退回浏览器时钟；从未上报为 null */
export function offlineAgo(node: Node): number | null {
  if (node.last_seen_ago !== undefined) return node.last_seen_ago
  if (!node.last_seen) return null
  return Math.max(0, Date.now() / 1000 - node.last_seen)
}

export const FOREVER = "∞"

export function expiryLabel(days: number | null): string {
  if (days === null) return FOREVER
  if (days < 0) return `已过期 ${-days} 天`
  return days === 0 ? "今天到期" : `${days} 天后到期`
}

/** 地区写死 zh-CN：显示不随访客的浏览器语言变；美元、港币写作 US$、HK$，不和人民币的 ¥ 混。
 *  currency 是旧版 hub 存下的值时 Intl 会抛错，退回「代码 + 金额」 */
export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export const CYCLES: Record<string, string> = {
  monthly: "月付",
  quarterly: "季付",
  semiannual: "半年付",
  yearly: "年付",
  biennial: "两年付",
  triennial: "三年付",
  once: "一次性",
}

/** 付款周期标签：具名的七个值之外，hub 还会给 `<n>m`（n 个月，1–1200） */
export function cycleLabel(cycle: string): string {
  const named = CYCLES[cycle]
  if (named) return named
  const months = /^(\d+)m$/.exec(cycle)
  return months ? `${months[1]} 个月` : cycle
}

/** 付款周期折算成月数；once 是 0，不认识的返回 null */
export function cycleMonths(cycle: string): number | null {
  if (cycle === "once") return 0
  const months = /^(\d+)m$/.exec(cycle)
  if (months) return Number(months[1])
  const NAMED: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    yearly: 12,
    biennial: 24,
    triennial: 36,
  }
  return NAMED[cycle] ?? null
}

export function osName(name: string): string {
  return name.replace("GNU/Linux ", "").replace(/\s*\([^)]*\)\s*$/, "")
}

export function cpuName(name: string): string {
  return name
    .replace(/\((R|TM|r|tm)\)/g, "")
    .replace(/\s+(CPU|Processor)\b/g, "")
    .replace(/\s+\d+-Core\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function monthUsed(rx: number, tx: number, mode: string): number {
  switch (mode) {
    case "up":
      return tx
    case "down":
      return rx
    case "max":
      return Math.max(rx, tx)
    default:
      return rx + tx
  }
}

export type Tone = "ok" | "warn" | "bad" | "muted"

export function loadTone(pct: number): Tone {
  return pct >= 90 ? "bad" : pct >= 75 ? "warn" : "ok"
}

export function latencyTone(ms: number | null, loss = 0): Tone {
  if (ms === null) return "bad"
  if (loss >= 20 || ms >= 300) return "bad"
  if (loss > 0 || ms >= 120) return "warn"
  return "ok"
}

export function jitterTone(ms: number | null): Tone {
  if (ms === null) return "muted"
  return ms <= 8 ? "ok" : ms <= 25 ? "warn" : "bad"
}

export function lossTone(pct: number): Tone {
  return pct <= 0 ? "ok" : pct < 5 ? "warn" : "bad"
}

/** 到期风险分级：none = 还早或永不到期，soon = 30 天内，critical = 7 天内或已过期 */
export type ExpiryRisk = "none" | "soon" | "critical"

export function expiryRisk(days: number | null): ExpiryRisk {
  if (days === null) return "none"
  if (days < 0 || days <= 7) return "critical"
  return days <= 30 ? "soon" : "none"
}

/** 到期颜色三档，卡片与列表共用同一套阈值（见 expiryRisk）：≤7 天或已过期红，
 *  ≤30 天琥珀，其余绿，永不到期中性 */
export function expiryTone(days: number | null): Tone {
  if (days === null) return "muted"
  const risk = expiryRisk(days)
  return risk === "critical" ? "bad" : risk === "soon" ? "warn" : "ok"
}

const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080].map((m) => m * 60_000)

export function timeTicks(from: number, to: number, count = 8): number[] {
  const step = TICK_STEPS.find((s) => (to - from) / s <= count) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const zone = new Date(from).getTimezoneOffset() * 60_000
  const ticks: number[] = []
  for (let t = Math.ceil((from - zone) / step) * step + zone; t <= to; t += step) ticks.push(t)
  return ticks
}

const LADDER: Record<number, number[]> = {
  10: [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10],
  1024: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
}

export function axisTop(max: number, floor: number, base = 10, cap = Infinity): number {
  const target = Math.min(cap, Math.max(max, floor)) / 4
  const scale = base ** Math.floor(Math.log(target) / Math.log(base))
  const step = LADDER[base].map((m) => m * scale).find((n) => n >= target)
  return Math.min(cap, (step ?? target) * 4)
}

export function quarters(top: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => top * f)
}

const HHMM = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" })

const MDHHMM = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export function clock(ms: number): string {
  return HHMM.format(ms)
}

export function clockFor(hours: number): (ms: number) => string {
  return hours <= 24 ? clock : (ms: number) => MDHHMM.format(ms)
}

export function flagOf(code: string): string {
  const c = code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return ""
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

let regions: Intl.DisplayNames | null | undefined

export function countryName(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code
  if (regions === undefined) {
    try {
      regions = new Intl.DisplayNames(["zh-CN"], { type: "region" })
    } catch {
      regions = null
    }
  }
  try {
    return regions?.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}
