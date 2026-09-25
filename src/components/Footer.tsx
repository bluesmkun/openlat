import { Activity, ExternalLink, Heart, Wrench } from "lucide-react"

import manifest from "../../theme.json"
import type { Me, Node } from "@/lib/api"

/** 页面底部页脚卡片：与节点卡同一套微拟物语言，放主题名 / 版本、站点与在线统计、源码与后台入口 */
export function Footer({ me, nodes }: { me: Me; nodes: Node[] | null }) {
  const total = nodes?.length ?? 0
  const online = nodes?.reduce((sum, node) => sum + (node.online ? 1 : 0), 0) ?? 0
  const offline = total - online

  return (
    <footer className="rise rounded-2xl border neu px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-sm">
            <Activity className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col items-start">
            <span className="text-sm leading-none font-semibold">
              {manifest.name}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">v{manifest.version}</span>
            </span>
            <span className="mt-1 max-w-52 truncate text-[11px] leading-none text-muted-foreground">
              {me.site_name ? `${me.site_name} · ` : ""}monitor 状态页主题
            </span>
          </span>
        </div>

        {total > 0 && (
          <span className="tnum hidden text-xs text-muted-foreground sm:inline">
            {total} 个节点 · <span className="text-ok">{online} 在线</span>
            {offline > 0 && (
              <>
                {" · "}
                <span className="text-destructive">{offline} 离线</span>
              </>
            )}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {manifest.url && (
            <a
              href={manifest.url}
              target="_blank"
              rel="noreferrer"
              title="主题源码"
              className="neu-track neu-press inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3.5 text-info" />
              源码
            </a>
          )}
          <a
            href="/admin/"
            title={me.authed ? "进入后台" : "登录"}
            className="neu-track neu-press inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <Wrench className="size-3.5 text-primary" />
            {me.authed ? "进入后台" : "登录"}
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-3 text-destructive/70" />
          WebSocket 实时推送 · 深浅色随系统自动切换
        </span>
        <span>
          Powered by{" "}
          <a
            href="https://github.com/monitor-probe/monitor"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
          >
            monitor
          </a>
          {" · © "}
          {new Date().getFullYear()} {me.site_name || manifest.name}
        </span>
      </div>
    </footer>
  )
}
