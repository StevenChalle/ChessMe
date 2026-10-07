import { useId } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

/** A threshold in % of winning chances, with optional landmarks under the track. */
export function ThresholdSlider({
  label,
  hint,
  value,
  range,
  markers = [],
  note,
  onChange,
}: {
  label: string
  hint: string
  value: number
  range: { min: number; max: number }
  markers?: { value: number; label: string }[]
  note?: string
  onChange: (value: number) => void
}) {
  const id = useId()
  const position = (at: number) => ((at - range.min) / (range.max - range.min)) * 100
  const visible = markers.filter((marker) => marker.value >= range.min && marker.value <= range.max)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          {note && <InfoTip text={note} />}
        </span>
        <span className="font-medium text-font-clear tabular-nums">{value} %</span>
      </div>
      <Slider
        id={id}
        min={range.min}
        max={range.max}
        step={1}
        value={[value]}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        aria-label={label}
      />
      {visible.length > 0 && (
        <div className="relative h-8 text-[0.7rem] text-muted-foreground" aria-hidden>
          {visible.map((marker) => (
            <span
              key={marker.value}
              className={cn(
                'absolute top-0 flex flex-col leading-tight',
                // Landmarks at either end of the track stay inside it.
                marker.value === range.min
                  ? 'items-start'
                  : marker.value === range.max
                    ? '-translate-x-full items-end'
                    : '-translate-x-1/2 items-center',
                marker.value === value && 'text-font-clear',
              )}
              style={{ left: `${position(marker.value)}%` }}
            >
              <span className="h-1.5 w-px bg-current" />
              <span>{marker.label}</span>
              <span className="tabular-nums">{marker.value}</span>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
