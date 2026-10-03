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

export function SourceLabel({ source }: { source: ApiSource }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <SourceDot source={source} />
      {SOURCE_LABELS[source]}
    </span>
  )
}
