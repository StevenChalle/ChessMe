import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('panel-etabli p-4 sm:p-5', className)}>
      {(title || aside) && (
        <header className="mb-3 flex items-baseline justify-between gap-4">
          {title && <h2 className="label-etabli">{title}</h2>}
          {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

/** `text`: the value is words (a date, "2 hours ago"), not a figure: not monospaced. */
export function StatTile({
  label,
  value,
  hint,
  text,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  text?: boolean
}) {
  return (
    <div className="tile-etabli">
      <div className="label-etabli">{label}</div>
      <div className={cn('tile-value mt-1', text && 'font-sans')}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
