import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Moon, SearchX, Sun, Wrench } from "lucide-react"

import { NodeCard } from "@/components/NodeCard"
import { CountryLabel } from "@/components/Bits"
import { NodeRow } from "@/components/NodeRow"
import { Summary } from "@/components/Summary"
import { Toolbar } from "@/components/Toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, useLatency, useNodes, type Me } from "@/lib/api"
import { useStoredState } from "@/lib/store"
import { GROUP_KEYS, groupNodes, searchNodes, sortNodes, SORT_KEYS, VIEW_MODES, type Group } from "@/lib/view"

const loadDetail = () => import("@/components/NodeDetail").then((m) => ({ default: m.NodeDetail }))
const NodeDetail = lazy(loadDetail)

function useNodeRoute() {
  const read = () => {
    const match = location.pathname.match(/^\/node\/(\d+)/)
    return match ? Number(match[1]) : null
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const sync = () => setId(read())
    addEventListener("popstate", sync)
    return () => removeEventListener("popstate", sync)
  }, [])
  return [
    id,
    (next: number | null) => {
      history.pushState({}, "", next === null ? "/" : `/node/${next}`)
      setId(next)
      scrollTo(0, 0)
    },
  ] as const
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches
  })
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])
  return [dark, () => setDark((d) => !d)] as const
}

function GroupHeader({ group }: { group: Group }) {
  const online = group.nodes.filter((n) => n.online).length
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      {group.code ? (
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <CountryLabel code={group.code} />
          {group.label}
        </h2>
      ) : (
        <h2 className="text-sm font-semibold">{group.label}</h2>
      )}
      <Badge variant="muted">{group.nodes.length}</Badge>
      <span className="tnum text-xs text-muted-foreground">{online} 在线</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export default function App() {
  const [dark, toggleTheme] = useTheme()
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState("")
  const { nodes, error, closed } = useNodes()
  const latency = useLatency(nodes)
  const [open, go] = useNodeRoute()

  const [view, setView] = useStoredState("openlat.view", "grid", VIEW_MODES)
  const [group, setGroup] = useStoredState("openlat.group", "none", GROUP_KEYS)
  const [sort, setSort] = useStoredState("openlat.sort", "default", SORT_KEYS)
  const [query, setQuery] = useState("")

  const loadMe = useCallback(
    () =>
      api<Me>("/me")
        .then((next) => {
          setMe(next)
          setMeError("")
        })
        .catch((e: Error) => setMeError(e.message || "网络错误")),
    [],
  )

  useEffect(() => {
    loadMe()
    void loadDetail()
  }, [loadMe])

  useEffect(() => {
    if (closed) void loadMe()
  }, [closed, loadMe])

  useEffect(() => {
    if (me && !me.public_page && !me.authed) location.href = "/admin/"
  }, [me])

  const sorted = useMemo(() => sortNodes(nodes ?? [], sort), [nodes, sort])
  const filtered = useMemo(() => searchNodes(sorted, query), [sorted, query])
  const groups = useMemo(() => groupNodes(filtered, group), [filtered, group])
  const selected = (nodes ?? []).find((n) => n.id === open)

  useEffect(() => {
    document.title = [selected?.name, me?.site_name || "Monitor"].filter(Boolean).join(" · ")
  }, [selected?.name, me?.site_name])

  if (!me) {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
        {meError ? (
          <div className="space-y-3 text-center">
            <p role="alert">加载失败：{meError}</p>
            <Button onClick={loadMe}>重试</Button>
          </div>
        ) : (
          "加载中…"
        )}
      </div>
    )
  }

  if (!me.public_page && !me.authed) return null

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6">
          <button className="flex items-center gap-2.5 transition-opacity hover:opacity-80" onClick={() => go(null)}>
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-sm">
              <Activity className="size-4" />
            </span>
            <span className="flex flex-col items-start">
              <span className="text-sm leading-none font-semibold">{me.site_name || "Monitor"}</span>
              <span className="mt-1 text-[10px] leading-none text-muted-foreground">节点在线状态</span>
            </span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <a
              href="/admin/"
              title={me.authed ? "进入后台" : "登录"}
              className="neu-track neu-press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              <Wrench className="size-3.5 text-primary" />
              <span>{me.authed ? "进入后台" : "登录"}</span>
            </a>
            <button
              onClick={toggleTheme}
              title="切换主题"
              className="neu-track neu-press grid size-8 shrink-0 place-items-center rounded-lg border text-foreground/80 transition-colors hover:text-foreground"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-5 sm:px-6">
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {open !== null ? (
          !nodes ? (
            <Skeleton className="h-96" />
          ) : selected ? (
            <Suspense fallback={<Skeleton className="h-96" />}>
              <NodeDetail
                node={selected}
                latency={selected.online ? latency[selected.id] : undefined}
                onBack={() => go(null)}
              />
            </Suspense>
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">
              节点不存在或未公开。
              <button className="ml-1 underline" onClick={() => go(null)}>
                返回列表
              </button>
            </p>
          )
        ) : !nodes ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <>
            <Summary nodes={filtered} latency={latency} onOpen={(id) => go(id)} />
            <Toolbar
              query={query}
              onQuery={setQuery}
              group={group}
              onGroup={setGroup}
              sort={sort}
              onSort={setSort}
              view={view}
              onView={setView}
            />

            {nodes.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">还没有节点</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-sm text-muted-foreground">
                <SearchX className="size-8 opacity-60" />
                没有匹配「{query}」的节点
                <Button variant="outline" onClick={() => setQuery("")}>
                  清空搜索
                </Button>
              </div>
            ) : (
              groups.map((groupItem) => (
                <section key={groupItem.key} className="space-y-3">
                  {groupItem.label && <GroupHeader group={groupItem} />}
                  {view === "grid" ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {groupItem.nodes.map((node) => (
                        <NodeCard
                          key={node.id}
                          node={node}
                          latency={node.online ? latency[node.id] : undefined}
                          onOpen={() => go(node.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupItem.nodes.map((node) => (
                        <NodeRow
                          key={node.id}
                          node={node}
                          latency={node.online ? latency[node.id] : undefined}
                          onOpen={() => go(node.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </>
        )}
      </main>
    </div>
  )
}
