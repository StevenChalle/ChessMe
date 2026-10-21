import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { SOURCE_LABELS } from '../summary'

/** Initials in the platform mark: neutral, never the platforms' own logos or colors. */
const SOURCE_INITIALS: Record<ApiSource, string> = {
  lichess: 'Li',
  chesscom: 'Cc',
}

/** A small square stamped with the platform's initials. */
export function SourceDot({ source, className }: { source: ApiSource; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[2px] border border-border-strong text-[8.5px] leading-none font-semibold text-muted-foreground',
        className,
      )}
    >
      {SOURCE_INITIALS[source]}
    </span>
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
