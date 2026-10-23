import { ChevronRight, RotateCcw } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

/**
 * Sections of a form that fold away (analysis filters, training options): one open at a time, a
 * short slide when switching, a summary of the values of each, open or closed.
 */
export function ExpandableGroup({
  defaultValue,
  children,
}: {
  /** The section open at first */
  defaultValue: string
  children: ReactNode
}) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultValue}
      className="space-y-3"
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

export type SectionAction = { disabled: boolean; onClick: () => void }

/**
 * A part of the form that folds away, with a one-line summary of its values. Inside
 * an accordion: opening one closes the others, with a short slide so the change is easy to follow.
 */
export function Expandable({
  value,
  title,
  summary,
  reset,
  defaults,
  children,
}: {
  /** Its name in the accordion */
  value: string
  title: string
  summary: string
  /** Puts the section back as in the current analysis (no button without an analysis) */
  reset?: SectionAction
  /** Puts the section back to the default values */
  defaults?: SectionAction
  children: ReactNode
}) {
  const actions = [
    defaults && { ...defaults, label: m.setup_reset_defaults(), className: undefined },
    // Too long for a phone's header, next to the title and summary.
    reset && { ...reset, label: m.setup_reset_to_analysis(), className: 'max-sm:hidden' },
  ].filter((action) => action !== undefined)
  return (
    <AccordionPrimitive.Item
      value={value}
      className="group/expandable overflow-hidden rounded-md border border-border"
    >
      <AccordionPrimitive.Header asChild>
        <div className="flex items-center gap-3 bg-field pr-4 transition-colors hover:bg-raised">
          <AccordionPrimitive.Trigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-4 text-left select-none">
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/expandable:rotate-90"
            />
            <span className="font-medium text-text-strong">{title}</span>
            <span className="min-w-0 truncate text-sm text-muted-foreground">{summary}</span>
          </AccordionPrimitive.Trigger>
          {actions.length > 0 && (
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {actions.map(({ label, disabled, onClick, className }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={disabled}
                  onClick={onClick}
                  className={cn('text-muted-foreground', className)}
                >
                  <RotateCcw data-icon="inline-start" />
                  {label}
                </Button>
              ))}
            </span>
          )}
        </div>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="space-y-6 border-t border-border p-4">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}
