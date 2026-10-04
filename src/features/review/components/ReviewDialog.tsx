import { Swords, Timer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sourceErrorMessage } from '@/features/player/sources'
import { GamesTable } from '@/features/games/components/GamesTable'
import { TrainingView } from '@/features/training/components/TrainingView'
import { formatClock, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { ReviewAccount } from '../analyze'
import { useGameReview, type ReviewState } from '../useGameReview'
import { ReviewSteps } from './ReviewSteps'

export function ReviewDialog({
  accounts,
  count,
  open,
  onOpenChange,
}: {
  accounts: ReviewAccount[]
  /** How many of the latest games: 10, or 1 for the last game */
  count: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{count === 1 ? m.review_title_last() : m.review_title()}</DialogTitle>
          <DialogDescription>{m.review_description()}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: closing the dialog aborts the review. */}
        <ReviewSession accounts={accounts} count={count} />
      </DialogContent>
    </Dialog>
  )
}

function ReviewSession({ accounts, count }: { accounts: ReviewAccount[]; count: number }) {
  const state = useGameReview(accounts, count)
  const [training, setTraining] = useState(false)
  const mistakes = useMemo(
    () => (state.status === 'done' ? state.outcome.games.flatMap((game) => game.mistakes) : []),
    [state],
  )
  const inTraining = training && state.status === 'done'

  return (
    <div className="min-w-0 space-y-2">
      {inTraining ? (
        <TrainingView mistakes={mistakes} onExit={() => setTraining(false)} />
      ) : (
        <ReviewContent
          state={state}
          single={count === 1}
          mistakeCount={mistakes.length}
          onTrain={() => setTraining(true)}
        />
      )}
      {/* Kept mounted (hidden) during training so the review time survives a round trip. */}
      <Stopwatch running={state.status === 'running'} hidden={inTraining} />
    </div>
  )
}

/** Discreet total time since the review started, frozen once it ends. */
function Stopwatch({ running, hidden }: { running: boolean; hidden: boolean }) {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(timer)
      setNow(Date.now())
    }
  }, [running])

  return (
    <p
      hidden={hidden}
      className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
      title={m.review_elapsed()}
    >
      <Timer aria-hidden className="size-3" />
      <span className="sr-only">{m.review_elapsed()}</span>
      {formatClock((now - startedAt) / 1000)}
    </p>
  )
}

function ReviewContent({
  state,
  single,
  mistakeCount,
  onTrain,
}: {
  state: ReviewState
  single: boolean
  mistakeCount: number
  onTrain: () => void
}) {
  if (state.status === 'running') return <ReviewSteps progress={state.progress} single={single} />
  if (state.status === 'error') return <p className="text-bad">{m.review_failed()}</p>

  const { games, failures } = state.outcome
  return (
    <div className="min-w-0 space-y-3">
      {failures.map(({ source, error }) => (
        <p key={source} className="text-sm text-bad">
          {sourceErrorMessage(source, error)}
        </p>
      ))}
      {games.length === 0 ? (
        <p className="text-muted-foreground">{m.review_no_games()}</p>
      ) : (
        <>
          <Button size="lg" disabled={mistakeCount === 0} onClick={onTrain}>
            <Swords data-icon="inline-start" />
            {m.training_start({ count: formatNumber(mistakeCount) })}
          </Button>
          <GamesTable
            games={games}
            extra={{
              header: m.review_col_errors(),
              cell: (game) => (
                <span
                  className={cn(
                    'text-base font-medium tabular-nums',
                    game.mistakes.length === 0 ? 'text-good' : 'text-bad',
                  )}
                >
                  {formatNumber(game.mistakes.length)}
                </span>
              ),
            }}
          />
        </>
      )}
    </div>
  )
}
