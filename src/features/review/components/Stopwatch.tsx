import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ActiveTime } from '@/lib/activeTime'
import { formatClock } from '@/lib/format'
import { m } from '@/paraglide/messages'

/**
 * Discreet duration of the analysis: ticking from `clock` while it runs, then the final
 * `durationMs`. Time spent with the page hidden is left out (the analysis pauses then).
 */
export function Stopwatch({ clock, durationMs }: { clock?: ActiveTime; durationMs?: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!clock) return
    const timer = setInterval(() => tick((count) => count + 1), 1000)
    return () => clearInterval(timer)
  }, [clock])
  const elapsedMs = durationMs ?? clock?.elapsedMs() ?? 0

  return (
    <p
      className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
      title={m.review_elapsed()}
    >
      <Timer aria-hidden className="size-3" />
      <span className="sr-only">{m.review_elapsed()}</span>
      {formatClock(Math.max(0, elapsedMs) / 1000)}
    </p>
  )
}
