import { useId } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * "Limit to [N] games", behind a checkbox: unchecked means no limit (no need to type 9999). The
 * number stays shown, dimmed, to check it again; typing one checks the box.
 */
export function LimitField({
  label,
  unit,
  info,
  limited,
  count,
  onChange,
}: {
  label: string
  unit: string
  info?: string
  limited: boolean
  count: number
  onChange: (value: { limited: boolean; count: number }) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={limited}
        onCheckedChange={(checked) => onChange({ limited: checked === true, count })}
        className="border-font-dim"
      />
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        min={1}
        value={Number.isNaN(count) ? '' : count}
        onChange={(event) => onChange({ limited: true, count: event.target.valueAsNumber })}
        aria-label={label}
        className={cn('h-8 w-24 bg-muted tabular-nums', !limited && 'opacity-50')}
      />
      <span className="text-muted-foreground">{unit}</span>
      {info && <InfoTip text={info} />}
    </div>
  )
}
