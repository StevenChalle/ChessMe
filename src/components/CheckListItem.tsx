import { useId, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/** The scrolling list the rows go in. */
export const CHECK_LIST_CLASS =
  'max-h-36 [scrollbar-width:thin] [scrollbar-color:var(--cyc-raised)_transparent] space-y-0.5 overflow-y-auto overscroll-contain rounded-md border border-border p-1'

/**
 * A row of a list of players to check, with how many games each has: the import's "which one is
 * you?" and the players whose saved games to keep.
 */
export function CheckListItem({
  label,
  count,
  checked,
  onChange,
}: {
  label: ReactNode
  /** Formatted: "12 games" */
  count: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <li className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="border-border-strong"
      />
      <Label htmlFor={id} className="flex flex-1 items-center justify-between gap-3 font-normal">
        <span className="min-w-0 truncate text-text-strong">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      </Label>
    </li>
  )
}
