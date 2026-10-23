import { RotateCcw } from 'lucide-react'
import { FeedbackNudge } from '@/components/FeedbackLink'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { summarize, type PuzzleResult } from '../session'

const ROWS: { result: PuzzleResult; label: () => string; className: string }[] = [
  { result: 'first-try', label: m.training_first_try, className: 'text-win' },
  { result: 'after-retries', label: m.training_after_retries, className: 'text-highlight' },
  { result: 'revealed', label: m.training_revealed, className: 'text-loss' },
]

/** Totals once every error has been replayed (or evaluated): each exercise done has its own. */
export function TrainingSummary({
  results,
  assessments,
  onRestart,
  onFinish,
}: {
  /** With the "replay" exercise */
  results?: PuzzleResult[]
  /** With the "evaluate" exercise: each position well evaluated or not */
  assessments?: boolean[]
  /** The same positions again, in a new draw */
  onRestart?: () => void
  onFinish: () => void
}) {
  const totals = summarize(results ?? [])
  const wellEvaluated = assessments?.filter(Boolean).length ?? 0
  return (
    <div className="mx-auto w-full max-w-sm space-y-4 py-2">
      <h3 className="text-lg font-semibold">{m.training_summary_title()}</h3>
      <dl className="space-y-2">
        {assessments && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{m.training_summary_assessments()}</dt>
            <dd className="num text-2xl font-medium text-text-strong">
              {m.training_summary_assessments_value({
                right: formatNumber(wellEvaluated),
                total: formatNumber(assessments.length),
              })}
            </dd>
          </div>
        )}
        {(results ? ROWS : []).map(({ result, label, className }) => (
          <div key={result} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{label()}</dt>
            <dd className={cn('num text-2xl font-medium', className)}>
              {formatNumber(totals[result])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2">
        {onRestart && (
          <Button size="lg" className="w-full" onClick={onRestart}>
            <RotateCcw data-icon="inline-start" />
            {m.training_restart()}
          </Button>
        )}
        <Button size="lg" variant="outline" className="w-full" onClick={onFinish}>
          {m.training_finish()}
        </Button>
      </div>
      <FeedbackNudge text={m.feedback_nudge_training()} />
    </div>
  )
}
