import type { Color } from 'chessops'
import { LoaderCircle, RotateCcw, Search } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { GameResult } from '@/features/games/normalize'
import { SourceLabel } from '@/features/player/components/SourceBadge'
import { categoryLabel } from '@/features/player/sources'
import { CATEGORIES, type Category } from '@/features/player/summary'
import { formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  DEFAULT_CRITERIA,
  ERROR_RANGE,
  isDefaultCriteria,
  LICHESS_MARKERS,
  normalizeCriteria,
  VALID_RANGE,
  type ReviewCriteria,
} from '../criteria'
import type { ReviewAccount } from '../fetch'
import {
  ALL_COLORS,
  ALL_RESULTS,
  DATE_PRESETS,
  datePresetRange,
  isSelectionValid,
  LATEST_SHORTCUTS,
  type DatePreset,
  type GameSelection,
} from '../selection'
import type { ReviewSettings } from '../settings'

/** Rated games per platform and time control, from the profiles (an indication). */
export type GameCounts = Partial<Record<ApiSource, Partial<Record<Category, number>>>>

const PRESET_LABELS: Record<DatePreset, () => string> = {
  week: m.preset_week,
  month: m.preset_month,
  '3months': m.preset_3months,
  year: m.preset_year,
}
const COLOR_LABELS: Record<Color, () => string> = { white: m.color_white, black: m.color_black }
const RESULT_LABELS: Record<GameResult, () => string> = {
  win: m.result_wins,
  draw: m.result_draws,
  loss: m.result_losses,
}

// Chips: clearly on or off (the default toggle style is too subtle on the dark theme).
const CHIP_CLASS =
  'border border-border px-3 text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/15 data-[state=on]:text-font-clear'

const SELECTED_SHORTCUT = 'bg-primary/15 text-font-clear ring-1 ring-primary hover:bg-primary/20'

/** yyyy-mm-dd in local time, for date inputs. */
function toDateInput(time: number): string {
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromDateInput(value: string, endOfDay: boolean): number | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return endOfDay
    ? new Date(year!, month! - 1, day!, 23, 59, 59, 999).getTime()
    : new Date(year!, month! - 1, day!).getTime()
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/**
 * Filters and thresholds of the advanced review, controlled by the analysis session (they survive
 * tab switches). "Find games" asks for the matching games; nothing is fetched before.
 */
export function ReviewSetup({
  accounts,
  gameCounts,
  value: { selection, criteria },
  onChange,
  finding,
  onFind,
}: {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
  value: ReviewSettings
  onChange: (settings: ReviewSettings) => void
  finding: boolean
  onFind: () => void
}) {
  const update = (change: Partial<GameSelection>) =>
    onChange({ selection: { ...selection, ...change }, criteria })
  const setCriteria = (next: ReviewCriteria) => onChange({ selection, criteria: next })

  const total = selection.sources.reduce(
    (sum, source) =>
      sum +
      selection.categories.reduce(
        (count, category) => count + (gameCounts[source]?.[category] ?? 0),
        0,
      ),
    0,
  )
  const { scope } = selection
  const valid = isSelectionValid(selection)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid && !finding) onFind()
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Section title={m.setup_platforms()}>
          <div className="flex flex-wrap gap-4">
            {accounts.map(({ source, username }) => (
              <CheckboxField
                key={source}
                checked={selection.sources.includes(source)}
                onChange={(checked) =>
                  update({
                    sources: checked
                      ? [...selection.sources, source]
                      : selection.sources.filter((item) => item !== source),
                  })
                }
              >
                <SourceLabel source={source} />
                <span className="text-muted-foreground">{username}</span>
              </CheckboxField>
            ))}
          </div>
        </Section>

        <Section title={m.setup_time_controls()}>
          <ToggleGroup
            type="multiple"
            value={selection.categories}
            onValueChange={(value) => update({ categories: value as Category[] })}
            className="flex-wrap"
          >
            {CATEGORIES.map((category) => (
              <ToggleGroupItem key={category} value={category} size="sm" className={CHIP_CLASS}>
                {categoryLabel(category)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>
      </div>

      <Section title={m.setup_games()}>
        <RadioGroup
          value={scope.kind}
          onValueChange={(kind) =>
            update({
              scope:
                kind === 'latest'
                  ? { kind: 'latest', count: 10 }
                  : { kind: 'range', preset: 'month', ...datePresetRange('month', Date.now()) },
            })
          }
          className="gap-4"
        >
          <div className="space-y-2">
            <RadioField value="latest">{m.setup_latest()}</RadioField>
            {scope.kind === 'latest' && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <Input
                  type="number"
                  min={1}
                  max={total > 0 ? total : undefined}
                  value={Number.isNaN(scope.count) ? '' : scope.count}
                  onChange={(event) =>
                    update({ scope: { kind: 'latest', count: event.target.valueAsNumber } })
                  }
                  aria-label={m.setup_latest()}
                  className="h-8 w-24 bg-muted tabular-nums"
                />
                {total > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {m.setup_latest_total({ total: formatNumber(total) })}
                  </span>
                )}
                <div className="flex gap-1">
                  {LATEST_SHORTCUTS.map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-pressed={scope.count === count}
                      className={cn(scope.count === count && SELECTED_SHORTCUT)}
                      onClick={() => update({ scope: { kind: 'latest', count } })}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <RadioField value="range">{m.setup_period()}</RadioField>
            {scope.kind === 'range' && (
              <div className="space-y-2 pl-6">
                <div className="flex flex-wrap gap-1">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-pressed={scope.preset === preset}
                      className={cn(scope.preset === preset && SELECTED_SHORTCUT)}
                      onClick={() =>
                        update({
                          scope: { kind: 'range', preset, ...datePresetRange(preset, Date.now()) },
                        })
                      }
                    >
                      {PRESET_LABELS[preset]()}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <DateField
                    label={m.setup_from()}
                    value={toDateInput(scope.from)}
                    onChange={(value) => {
                      const from = fromDateInput(value, false)
                      if (from !== undefined)
                        update({ scope: { kind: 'range', from, to: scope.to } })
                    }}
                  />
                  <DateField
                    label={m.setup_to()}
                    value={toDateInput(scope.to)}
                    onChange={(value) => {
                      const to = fromDateInput(value, true)
                      if (to !== undefined)
                        update({ scope: { kind: 'range', from: scope.from, to } })
                    }}
                  />
                  {!scope.preset && (
                    <span className="text-xs text-muted-foreground">{m.preset_custom()}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </RadioGroup>
      </Section>

      <div className="grid gap-6 md:grid-cols-3">
        <Section title={m.setup_color()}>
          <ToggleGroup
            type="multiple"
            value={selection.colors}
            onValueChange={(value) => update({ colors: value as Color[] })}
          >
            {ALL_COLORS.map((color) => (
              <ToggleGroupItem key={color} value={color} size="sm" className={CHIP_CLASS}>
                {COLOR_LABELS[color]()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>
        <Section title={m.setup_result()}>
          <ToggleGroup
            type="multiple"
            value={selection.results}
            onValueChange={(value) => update({ results: value as GameResult[] })}
            className="flex-wrap"
          >
            {ALL_RESULTS.map((result) => (
              <ToggleGroupItem key={result} value={result} size="sm" className={CHIP_CLASS}>
                {RESULT_LABELS[result]()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>
        <Section title={m.setup_min_moves()}>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={selection.minMoves}
              onChange={(event) =>
                update({ minMoves: Math.max(0, Math.floor(event.target.valueAsNumber || 0)) })
              }
              aria-label={m.setup_min_moves()}
              className="h-8 w-20 bg-muted tabular-nums"
            />
            <span className="text-sm text-muted-foreground">{m.setup_moves_unit()}</span>
          </div>
          <p className="text-xs text-muted-foreground">{m.setup_min_moves_hint()}</p>
        </Section>
      </div>

      <Section title={m.setup_thresholds()}>
        <div className="grid gap-6 md:grid-cols-2">
          <ThresholdSlider
            label={m.setup_error()}
            hint={m.setup_error_hint({ value: String(criteria.errorMinDrop) })}
            value={criteria.errorMinDrop}
            range={ERROR_RANGE}
            markers={[
              { value: LICHESS_MARKERS.inaccuracy, label: m.marker_inaccuracy() },
              { value: LICHESS_MARKERS.mistake, label: m.marker_mistake() },
              { value: LICHESS_MARKERS.blunder, label: m.marker_blunder() },
            ]}
            note={m.setup_markers_note()}
            onChange={(errorMinDrop) =>
              setCriteria(normalizeCriteria({ ...criteria, errorMinDrop }, 'errorMinDrop'))
            }
          />
          <ThresholdSlider
            label={m.setup_valid()}
            hint={m.setup_valid_hint({ value: String(criteria.validMaxDrop) })}
            value={criteria.validMaxDrop}
            range={VALID_RANGE}
            onChange={(validMaxDrop) =>
              setCriteria(normalizeCriteria({ ...criteria, validMaxDrop }, 'validMaxDrop'))
            }
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isDefaultCriteria(criteria)}
          onClick={() => setCriteria(DEFAULT_CRITERIA)}
          className="text-muted-foreground"
        >
          <RotateCcw data-icon="inline-start" />
          {m.setup_reset()}
        </Button>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" size="lg" disabled={!valid || finding}>
          {finding ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Search data-icon="inline-start" />
          )}
          {finding ? m.setup_finding() : m.setup_find()}
        </Button>
        {!valid && <span className="text-sm text-bad">{m.setup_invalid()}</span>}
      </div>
    </form>
  )
}

function CheckboxField({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <Label htmlFor={id} className="flex items-center gap-2 font-normal">
        {children}
      </Label>
    </div>
  )
}

function RadioField({ value, children }: { value: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} className="border-font-dim" />
      <Label htmlFor={id} className="font-normal">
        {children}
      </Label>
    </div>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <span className="flex items-center gap-1.5">
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-auto bg-muted [color-scheme:dark]"
      />
    </span>
  )
}

/** A threshold in % of winning chances, with optional landmarks under the track. */
function ThresholdSlider({
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
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
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
      {markers.length > 0 && (
        <div className="relative h-8 text-[0.7rem] text-muted-foreground" aria-hidden>
          {markers.map((marker) => (
            <span
              key={marker.value}
              className={cn(
                'absolute top-0 flex -translate-x-1/2 flex-col items-center leading-tight',
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
      {note && <p className="text-xs text-muted-foreground/80">{note}</p>}
    </div>
  )
}
