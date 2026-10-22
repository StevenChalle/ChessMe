import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { SOURCE_COLOR_CLASS } from '../sources'
import { SOURCE_LABELS } from '../summary'

export function SourceDot({ source, className }: { source: ApiSource; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        SOURCE_COLOR_CLASS[source],
        className,
      )}
    />
  )
}

/** `compact`: the dot alone on phones, the name kept for screen readers. */
export function SourceLabel({ source, compact }: { source: ApiSource; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <SourceDot source={source} />
      <span className={cn(compact && 'max-sm:sr-only')}>{SOURCE_LABELS[source]}</span>
    </span>
  )
}
