import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { summarize, type PuzzleResult } from '../session'

const ROWS: { result: PuzzleResult; label: () => string; className: string }[] = [
  { result: 'first-try', label: m.training_first_try, className: 'text-good' },
  { result: 'after-retries', label: m.training_after_retries, className: 'text-brag' },
  { result: 'revealed', label: m.training_revealed, className: 'text-bad' },
]

/** Totals once every error has been replayed. */
export function TrainingSummary({
  results,
  onRestart,
  onFinish,
}: {
  results: PuzzleResult[]
  /** The same positions again, in a new draw */
  onRestart?: () => void
  onFinish: () => void
}) {
  const totals = summarize(results)
  return (
    <div className="mx-auto w-full max-w-sm space-y-4 py-2">
      <h3 className="text-lg font-medium text-font-clear">{m.training_summary_title()}</h3>
      <dl className="space-y-2">
        {ROWS.map(({ result, label, className }) => (
          <div key={result} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{label()}</dt>
            <dd className={cn('text-2xl font-medium tabular-nums', className)}>
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
    </div>
  )
}
