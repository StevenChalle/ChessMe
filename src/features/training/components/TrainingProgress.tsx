import { cn } from '@/lib/utils'

/**
 * One mark per position of the training, in the theme's gold: done ones filled, the current one
 * half, the others empty. With many positions the marks just get thinner.
 */
export function TrainingProgress({
  total,
  done,
  label,
}: {
  total: number
  /** Positions done, the first ones */
  done: number
  label: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={cn('flex h-1.5 w-full', total > 30 ? 'gap-px' : 'gap-1')}
    >
      {Array.from({ length: total }, (_, position) => (
        <span
          key={position}
          className={cn(
            'min-w-0 flex-1 rounded-full',
            position < done
              ? 'bg-primary'
              : position === done
                ? 'bg-primary/40'
                : 'bg-field ring-1 ring-border ring-inset',
          )}
        />
      ))}
    </div>
  )
}
