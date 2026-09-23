/** 滚动期间挂起高频数据更新，停止滚动后再一次性补上。
 *  推送与延迟刷新常常正好落在滚动帧上，重绘叠加滚动就会掉帧，
 *  滚动时先攒着、停下来再提交，滑动过程只跑合成器。 */
type Flush = () => void

const waiting = new Set<Flush>()
let idle = true
let timer: ReturnType<typeof setTimeout> | null = null

export function isScrollIdle(): boolean {
  return idle
}

export function onScrollIdle(flush: Flush): () => void {
  waiting.add(flush)
  return () => {
    waiting.delete(flush)
  }
}

if (typeof window !== "undefined") {
  addEventListener(
    "scroll",
    () => {
      idle = false
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        idle = true
        for (const flush of [...waiting]) flush()
      }, 160)
    },
    { passive: true },
  )
}
