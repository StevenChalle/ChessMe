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
    <section className={cn('rounded-md bg-card p-4', className)}>
      {(title || aside) && (
        <header className="mb-3 flex items-baseline justify-between gap-4">
          {title && (
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {title}
            </h2>
          )}
          {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="rounded-md bg-card p-4">
      <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-2xl font-medium text-font-clear tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
