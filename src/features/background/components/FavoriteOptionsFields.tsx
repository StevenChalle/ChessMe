import { useId, useState } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { depthRange, type FavoriteOptions } from '../favorites'

/**
 * A favorite's options: how many of their latest games to keep analysed, and the deep option
 * (docs/background-analysis.md). In the settings and in the window adding a favorite.
 */
export function FavoriteOptionsFields({
  options,
  onChange,
}: {
  options: FavoriteOptions
  onChange: (options: FavoriteOptions) => void
}) {
  const range = depthRange()
  // While dragging: shown at once, applied on release (a new depth restarts the analysis).
  const [dragged, setDragged] = useState<number | undefined>(undefined)
  const depth = dragged ?? options.depth
  const sliderId = useId()
  const deepId = useId()
  const position = (value: number) => ((value - range.min) / (range.max - range.min)) * 100
  const apply = (value: number) => {
    setDragged(undefined)
    if (value !== options.depth) onChange({ ...options, depth: value })
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={sliderId} className="text-xs font-normal text-muted-foreground">
            {m.favorites_depth()}
          </Label>
          <span className="num font-medium text-text-strong">{formatNumber(depth)}</span>
        </div>
        <Slider
          id={sliderId}
          aria-label={m.favorites_depth()}
          min={range.min}
          max={range.max}
          step={range.step}
          value={[depth]}
          onValueChange={([value]) => setDragged(value)}
          onValueCommit={([value]) => value !== undefined && apply(value)}
        />
        {/* The usual choices, as landmarks: a click goes straight to one. */}
        <div className="relative h-4 text-[0.7rem]">
          {range.marks.map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => apply(mark)}
              className={cn(
                'num absolute top-0 rounded-sm px-0.5 leading-none hover:text-text-strong',
                mark === range.min
                  ? '-translate-x-0.5'
                  : mark === range.max
                    ? 'translate-x-[calc(-100%+2px)]'
                    : '-translate-x-1/2',
                mark === depth ? 'font-semibold text-primary' : 'text-muted-foreground',
              )}
              style={{ left: `${position(mark)}%` }}
            >
              {formatNumber(mark)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={deepId}
          checked={options.deep}
          onCheckedChange={(value) => onChange({ ...options, deep: value === true })}
          className="border-border-strong"
        />
        <Label htmlFor={deepId} className="font-normal text-text-strong">
          {m.favorites_deep()}
        </Label>
        <InfoTip text={m.favorites_deep_hint()} />
      </div>
    </div>
  )
}
