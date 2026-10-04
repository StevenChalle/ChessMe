import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** Discreet time since the analysis started (Unix ms), frozen at `endedAt` once it ends. */
export function Stopwatch({ startedAt, endedAt }: { startedAt: number; endedAt?: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endedAt !== undefined) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endedAt])

  return (
    <p
      className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
      title={m.review_elapsed()}
    >
      <Timer aria-hidden className="size-3" />
      <span className="sr-only">{m.review_elapsed()}</span>
      {formatClock(Math.max(0, (endedAt ?? now) - startedAt) / 1000)}
    </p>
  )
}
