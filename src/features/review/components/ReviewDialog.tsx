import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sourceErrorMessage } from '@/features/player/sources'
import { formatClock } from '@/lib/format'
import { m } from '@/paraglide/messages'
import type { ReviewAccount } from '../analyze'
import { useGameReview, type ReviewState } from '../useGameReview'
import { ReviewSteps } from './ReviewSteps'
import { ReviewTable } from './ReviewTable'

export function ReviewDialog({
  accounts,
  open,
  onOpenChange,
}: {
  accounts: ReviewAccount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{m.review_title()}</DialogTitle>
          <DialogDescription>{m.review_description()}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: closing the dialog aborts the review. */}
        <ReviewSession accounts={accounts} />
      </DialogContent>
    </Dialog>
  )
}

function ReviewSession({ accounts }: { accounts: ReviewAccount[] }) {
  const state = useGameReview(accounts)
  return (
    <div className="min-w-0 space-y-2">
      <ReviewContent state={state} />
      <Stopwatch running={state.status === 'running'} />
    </div>
  )
}

/** Discreet total time since the review started, frozen once it ends. */
function Stopwatch({ running }: { running: boolean }) {
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
      className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
      title={m.review_elapsed()}
    >
      <Timer aria-hidden className="size-3" />
      <span className="sr-only">{m.review_elapsed()}</span>
      {formatClock((now - startedAt) / 1000)}
    </p>
  )
}

function ReviewContent({ state }: { state: ReviewState }) {
  if (state.status === 'running') return <ReviewSteps progress={state.progress} />
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
        <ReviewTable games={games} />
      )}
    </div>
  )
}
