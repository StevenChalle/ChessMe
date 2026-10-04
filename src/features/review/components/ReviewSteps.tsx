import { Check, Circle, LoaderCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatDuration, formatGameCount, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  REVIEW_STEPS,
  stepStatus,
  type ReviewProgress,
  type ReviewStep,
  type StepStatus,
} from '../progress'

const STEP_LABELS: Record<ReviewStep, { title: () => string; hint: () => string }> = {
  fetch: { title: m.review_step_fetch, hint: m.review_step_fetch_hint },
  quick: { title: m.review_step_quick, hint: m.review_step_quick_hint },
  deep: { title: m.review_step_deep, hint: m.review_step_deep_hint },
}

/** Short result of a finished step: "10 games", "908 positions". */
function stepSummary(step: ReviewStep, progress: ReviewProgress): string | undefined {
  if (progress.phase === 'fetching') return undefined
  if (step === 'fetch') return formatGameCount(progress.games)
  if (step === 'quick' && progress.phase === 'analysing') {
    const count = progress.quickTotal
    return m.positions_count({ count, formatted: formatNumber(count) })
  }
  return undefined
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <Check className="size-4 text-good" />
  if (status === 'current') return <LoaderCircle className="size-4 animate-spin text-primary" />
  return <Circle className="size-4 text-muted-foreground/50" />
}

/**
 * Every step of the review, visible from the start: done steps are checked with a summary,
 * the current one shows its progress, upcoming ones are dimmed.
 */
export function ReviewSteps({
  progress,
  single,
}: {
  progress: ReviewProgress
  /** Reviewing the last game only */
  single?: boolean
}) {
  return (
    <ol className="space-y-3">
      {REVIEW_STEPS.map((step) => {
        const status = stepStatus(step, progress)
        const summary = status === 'done' ? stepSummary(step, progress) : undefined
        return (
          <li key={step} className="flex gap-3">
            <span className="mt-0.5">
              <StepIcon status={status} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p
                className={cn(
                  'flex flex-wrap justify-between gap-x-4',
                  status === 'upcoming' ? 'text-muted-foreground' : 'text-font-clear',
                )}
              >
                <span>
                  {single && step === 'fetch'
                    ? m.review_step_fetch_last()
                    : STEP_LABELS[step].title()}
                </span>
                {summary && <span className="text-muted-foreground tabular-nums">{summary}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{STEP_LABELS[step].hint()}</p>
              {status === 'current' && progress.phase === 'analysing' && (
                <PassProgress progress={progress} />
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PassProgress({
  progress: { done, total, remainingSeconds },
}: {
  progress: Extract<ReviewProgress, { phase: 'analysing' }>
}) {
  return (
    <div className="space-y-1 pt-1">
      <Progress value={total > 0 ? (done / total) * 100 : 100} />
      <p className="flex flex-wrap justify-between gap-x-4 text-xs text-muted-foreground tabular-nums">
        <span>
          {m.review_positions_progress({ done: formatNumber(done), total: formatNumber(total) })}
        </span>
        <span>
          {remainingSeconds === undefined
            ? m.review_estimating()
            : m.review_remaining({ time: formatDuration(remainingSeconds) })}
        </span>
      </p>
    </div>
  )
}
