import { AppWindow, CircleCheck, Clock, LoaderCircle, Pause, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { formatGameCount, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { useBackground } from '../backgroundContext'
import type { BackgroundPhase, BackgroundState } from '../runner'

const ICONS: Record<BackgroundPhase, typeof Pause> = {
  starting: LoaderCircle,
  elsewhere: AppWindow,
  syncing: LoaderCircle,
  analysing: LoaderCircle,
  'up-to-date': CircleCheck,
  busy: Pause,
  paused: Pause,
  'rate-limited': Clock,
  failed: TriangleAlert,
}

function statusText({ phase, done = 0, total = 0 }: BackgroundState): string {
  switch (phase) {
    case 'starting':
      return m.background_starting()
    case 'elsewhere':
      return total > 0
        ? m.background_elsewhere_progress({ done: formatNumber(done), total: formatNumber(total) })
        : m.background_elsewhere()
    case 'syncing':
      return m.background_syncing()
    case 'analysing':
      return m.background_analysing({ done: formatNumber(done), total: formatNumber(total) })
    case 'up-to-date':
      return m.background_up_to_date({ games: formatGameCount(total) })
    case 'busy':
      return m.background_busy()
    case 'paused':
      return m.background_paused()
    case 'rate-limited':
      return m.background_rate_limited()
    case 'failed':
      return m.background_failed()
  }
}

/**
 * In the header, when main accounts are chosen: how far the background analysis is, and a button
 * to pause it for the session (docs/background-analysis.md).
 */
export function BackgroundIndicator() {
  const background = useBackground()
  if (!background) return null
  const { state, pause, resume } = background
  const Icon = ICONS[state.phase]
  const spinning = state.phase === 'syncing' || state.phase === 'analysing'
  const showCount = state.total !== undefined && state.total > 0 && state.phase !== 'up-to-date'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={m.background_title()}
          title={statusText(state)}
          className="gap-1.5 px-2 text-muted-foreground hover:text-text-strong"
        >
          <Icon
            className={cn(
              spinning && 'animate-spin text-primary',
              state.phase === 'up-to-date' && 'text-win',
            )}
          />
          {showCount && (
            <span className="text-xs tabular-nums">
              {formatNumber(state.done ?? 0)} / {formatNumber(state.total!)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 text-sm">
        <p className="label-etabli">{m.background_title()}</p>
        <p className="text-text-strong" role="status">
          {statusText(state)}
        </p>
        {state.total !== undefined && state.total > 0 && (
          <Progress value={(((state.done ?? 0) + (state.current ?? 0)) / state.total) * 100} />
        )}
        <p className="text-xs text-muted-foreground">{m.background_hint()}</p>
        {state.phase === 'paused' ? (
          <Button variant="outline" size="sm" onClick={resume}>
            {m.background_resume()}
          </Button>
        ) : (
          state.phase !== 'elsewhere' && (
            <Button variant="outline" size="sm" onClick={pause}>
              {m.background_pause()}
            </Button>
          )
        )}
      </PopoverContent>
    </Popover>
  )
}
