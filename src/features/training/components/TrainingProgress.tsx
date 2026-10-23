import { cn } from '@/lib/utils'
import type { PuzzleResult } from '../session'

/** Same colors as the summary. */
const RESULT_CLASS: Record<PuzzleResult, string> = {
  'first-try': 'bg-win',
  'after-retries': 'bg-highlight',
  revealed: 'bg-loss',
}

/**
 * One mark per position of the training: done ones in the color of their result, the current one
 * outlined, the others empty. With many positions the marks just get thinner.
 */
export function TrainingProgress({
  total,
  index,
  results,
  label,
}: {
  total: number
  /** The position on screen */
  index: number
  /** Results of the positions done, in order */
  results: PuzzleResult[]
  label: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={results.length}
      className={cn('flex h-1.5 w-full', total > 30 ? 'gap-px' : 'gap-1')}
    >
      {Array.from({ length: total }, (_, position) => {
        const result = results[position]
        return (
          <span
            key={position}
            className={cn(
              'min-w-0 flex-1 rounded-full',
              result
                ? RESULT_CLASS[result]
                : position === index
                  ? 'bg-text-strong/70'
                  : 'bg-field ring-1 ring-border ring-inset',
            )}
          />
        )
      })}
    </div>
  )
}
