import type { Color } from 'chessops'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { LimitField } from '@/components/LimitField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { GameResult } from '@/features/games/normalize'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { categoryLabel } from '@/features/player/sources'
import { CATEGORIES, SOURCE_LABELS, type Category } from '@/features/player/summary'
import { formatDate, formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  DEFAULT_CRITERIA,
  ERROR_RANGE,
  normalizeCriteria,
  VALID_RANGE,
  type ReviewCriteria,
} from '../criteria'
import { lichessMarkers } from '../markers'
import { ThresholdSlider } from './ThresholdSlider'
import type { ReviewAccount } from '../fetch'
import {
  ALL_COLORS,
  ALL_RATINGS,
  ALL_RESULTS,
  DATE_PRESETS,
  datePresetRange,
  DEFAULT_RANGE_MAX,
  isSelectionValid,
  LATEST_SHORTCUTS,
  type DatePreset,
  type GameScope,
  type GameSelection,
  type RatingKind,
} from '../selection'
import { sameCriteria, sameFilters, sameScope, type ReviewSettings } from '../settings'

const PRESET_LABELS: Record<DatePreset, () => string> = {
  today: m.preset_today,
  week: m.preset_week,
  month: m.preset_month,
  '3months': m.preset_3months,
  year: m.preset_year,
}
const RATING_LABELS: Record<RatingKind, () => string> = {
  rated: m.rating_rated,
  casual: m.rating_casual,
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

type SectionAction = { disabled: boolean; onClick: () => void }

/** A part of the form that folds away, with a one-line summary of its values when closed. */
function Expandable({
  title,
  summary,
  open,
  reset,
  defaults,
  children,
}: {
  title: string
  summary: string
  open?: boolean
  /** Puts the section back as in the current analysis (no button without an analysis) */
  reset?: SectionAction
  /** Puts the section back to the default values */
  defaults?: SectionAction
  children: ReactNode
}) {
  const actions = [
    defaults && { ...defaults, label: m.setup_reset_defaults() },
    reset && { ...reset, label: m.setup_reset_to_analysis() },
  ].filter((action) => action !== undefined)
  return (
    <details open={open} className="group/expandable rounded-md border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open/expandable:rotate-90"
        />
        <span className="font-medium text-font-clear">{title}</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground group-open/expandable:hidden">
          {summary}
        </span>
        {actions.length > 0 && (
          // Not a click on the summary, even on a disabled button: the section stays as it is.
          <span
            className="ml-auto flex shrink-0 flex-wrap justify-end gap-1"
            onClick={(event) => event.preventDefault()}
          >
            {actions.map(({ label, disabled, onClick }) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="xs"
                disabled={disabled}
                onClick={onClick}
                className="text-muted-foreground"
              >
                <RotateCcw data-icon="inline-start" />
                {label}
              </Button>
            ))}
          </span>
        )}
      </summary>
      <div className="space-y-6 border-t border-border p-4">{children}</div>
    </details>
  )
}

type RangeScope = Extract<GameScope, { kind: 'range' }>

function scopeSummary(scope: GameScope): string {
  if (scope.kind === 'latest') return m.setup_summary_latest({ count: formatNumber(scope.count) })
  const period = scope.preset
    ? PRESET_LABELS[scope.preset]()
    : `${formatDate(new Date(scope.from))} – ${formatDate(new Date(scope.to))}`
  return scope.max === undefined
    ? m.setup_summary_period({ period })
    : m.setup_summary_period_max({ period, max: formatNumber(scope.max) })
}

/** What the games filters leave out, or "all games". */
function gamesSummary(selection: GameSelection, accounts: ReviewAccount[]): string {
  const parts: string[] = []
  const some = <T,>(chosen: T[], all: readonly T[], label: (item: T) => string) => {
    if (chosen.length < all.length) parts.push(chosen.map(label).join(', '))
  }
  some(
    selection.sources,
    accounts.map((account) => account.source),
    (source) => SOURCE_LABELS[source],
  )
  some(selection.ratings, ALL_RATINGS, (rating) => RATING_LABELS[rating]())
  some(selection.categories, CATEGORIES, categoryLabel)
  some(selection.colors, ALL_COLORS, (color) => COLOR_LABELS[color]())
  some(selection.results, ALL_RESULTS, (result) => RESULT_LABELS[result]())
  if (selection.minMoves > 0) {
    parts.push(m.setup_summary_min_moves({ count: formatNumber(selection.minMoves) }))
  }
  return parts.length > 0 ? parts.join(' · ') : m.setup_summary_all_games()
}

/**
 * Filters and thresholds of the advanced review, controlled by the analysis session (they survive
 * tab switches). The filters tab looks for the matching games after every change.
 */
export function ReviewSetup({
  accounts,
  gameTotal,
  value: { selection, criteria },
  onChange,
  reference,
}: {
  accounts: ReviewAccount[]
  /** Games played on all the accounts, from the profiles (an indication) */
  gameTotal: number
  value: ReviewSettings
  onChange: (settings: ReviewSettings) => void
  /** The current analysis's settings, if any: each section can go back to them */
  reference?: ReviewSettings
}) {
  const update = (change: Partial<GameSelection>) =>
    onChange({ selection: { ...selection, ...change }, criteria })
  const setCriteria = (next: ReviewCriteria) => onChange({ selection, criteria: next })
  const sectionReset = (
    same: (ref: ReviewSettings) => boolean,
    restore: (ref: ReviewSettings) => void,
  ) => reference && { disabled: same(reference), onClick: () => restore(reference) }

  const { scope } = selection
  const valid = isSelectionValid(selection)
  // Both ways of choosing games stay visible: the inactive one keeps its last values, dimmed,
  // and using it makes it the active one.
  const [lastLatest, setLastLatest] = useState(scope.kind === 'latest' ? scope.count : 10)
  const [lastRange, setLastRange] = useState<RangeScope>(() =>
    scope.kind === 'range'
      ? scope
      : {
          kind: 'range',
          preset: 'month',
          ...datePresetRange('month', Date.now()),
        },
  )
  const latest = scope.kind === 'latest' ? scope.count : lastLatest
  const range = scope.kind === 'range' ? scope : lastRange
  const setLatest = (count: number) => {
    setLastLatest(count)
    update({ scope: { kind: 'latest', count } })
  }
  const setRange = (next: RangeScope) => {
    setLastRange(next)
    update({ scope: next })
  }

  return (
    <div className="space-y-3">
      <Expandable
        title={m.setup_section_range()}
        summary={scopeSummary(scope)}
        open
        reset={sectionReset(
          (ref) => sameScope(scope, ref.selection.scope),
          (ref) => update({ scope: ref.selection.scope }),
        )}
      >
        <RadioGroup
          value={scope.kind}
          onValueChange={(kind) => (kind === 'latest' ? setLatest(latest) : setRange(range))}
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="space-y-3">
            <RadioField value="latest">{m.setup_latest()}</RadioField>
            <div
              className={cn(
                'space-y-3 pl-6 transition-opacity',
                scope.kind !== 'latest' && 'opacity-50',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={gameTotal > 0 ? gameTotal : undefined}
                  value={Number.isNaN(latest) ? '' : latest}
                  onChange={(event) => setLatest(event.target.valueAsNumber)}
                  aria-label={m.setup_latest()}
                  className="h-8 w-24 bg-muted tabular-nums"
                />
                {gameTotal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {m.setup_latest_total({ total: formatNumber(gameTotal) })}
                  </span>
                )}
                {gameTotal > 0 && accounts.some((account) => account.source === 'chesscom') && (
                  <InfoTip text={m.chesscom_rated_only()} />
                )}
              </div>
              <div className="flex gap-1">
                {LATEST_SHORTCUTS.map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-pressed={scope.kind === 'latest' && latest === count}
                    className={cn(scope.kind === 'latest' && latest === count && SELECTED_SHORTCUT)}
                    onClick={() => setLatest(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <RadioField value="range">{m.setup_period()}</RadioField>
            <div
              className={cn(
                'space-y-3 pl-6 transition-opacity',
                scope.kind !== 'range' && 'opacity-50',
              )}
            >
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-pressed={scope.kind === 'range' && range.preset === preset}
                    className={cn(
                      scope.kind === 'range' && range.preset === preset && SELECTED_SHORTCUT,
                    )}
                    onClick={() =>
                      setRange({
                        kind: 'range',
                        preset,
                        ...datePresetRange(preset, Date.now()),
                        max: range.max,
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
                  value={toDateInput(range.from)}
                  onChange={(value) => {
                    const from = fromDateInput(value, false)
                    if (from !== undefined) {
                      setRange({ kind: 'range', from, to: range.to, max: range.max })
                    }
                  }}
                />
                <DateField
                  label={m.setup_to()}
                  value={toDateInput(range.to)}
                  onChange={(value) => {
                    const to = fromDateInput(value, true)
                    if (to !== undefined) {
                      setRange({ kind: 'range', from: range.from, to, max: range.max })
                    }
                  }}
                />
                {!range.preset && (
                  <span className="text-xs text-muted-foreground">{m.preset_custom()}</span>
                )}
              </div>
              <RangeMaxField value={range.max} onChange={(max) => setRange({ ...range, max })} />
            </div>
          </div>
        </RadioGroup>
      </Expandable>

      <Expandable
        title={m.setup_games()}
        summary={gamesSummary(selection, accounts)}
        reset={sectionReset(
          (ref) => sameFilters(selection, ref.selection),
          (ref) => update({ ...ref.selection, scope }),
        )}
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
          <Section title={m.setup_platforms()}>
            <ToggleGroup
              type="multiple"
              value={selection.sources}
              onValueChange={(value) => update({ sources: value as ApiSource[] })}
              className="flex-wrap"
            >
              {accounts.map(({ source, username }) => (
                <ToggleGroupItem key={source} value={source} size="sm" className={CHIP_CLASS}>
                  <SourceDot source={source} />
                  {SOURCE_LABELS[source]}
                  <span className="text-muted-foreground">{username}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Section>

          <Section title={m.setup_ratings()}>
            <ToggleGroup
              type="multiple"
              value={selection.ratings}
              onValueChange={(value) => update({ ratings: value as RatingKind[] })}
              className="flex-wrap"
            >
              {ALL_RATINGS.map((rating) => (
                <ToggleGroupItem key={rating} value={rating} size="sm" className={CHIP_CLASS}>
                  {RATING_LABELS[rating]()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
              <InfoTip text={m.setup_min_moves_hint()} />
            </div>
          </Section>
        </div>
      </Expandable>

      <Expandable
        title={m.setup_section_training()}
        defaults={{
          disabled: sameCriteria(criteria, DEFAULT_CRITERIA),
          onClick: () => setCriteria(DEFAULT_CRITERIA),
        }}
        reset={sectionReset(
          (ref) => sameCriteria(criteria, ref.criteria),
          (ref) => setCriteria(ref.criteria),
        )}
        summary={m.setup_summary_training({
          error: String(criteria.errorMinDrop),
          valid: String(criteria.validMaxDrop),
        })}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <ThresholdSlider
            label={m.setup_error()}
            hint={m.setup_error_hint({ value: String(criteria.errorMinDrop) })}
            value={criteria.errorMinDrop}
            range={ERROR_RANGE}
            markers={lichessMarkers()}
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
            markers={lichessMarkers()}
            note={m.setup_valid_info()}
            onChange={(validMaxDrop) =>
              setCriteria(normalizeCriteria({ ...criteria, validMaxDrop }, 'validMaxDrop'))
            }
          />
        </div>
      </Expandable>

      {!valid && <p className="text-sm text-bad">{m.setup_invalid()}</p>}
    </div>
  )
}

/** The period's maximum: unchecked means no limit (see LimitField). The latest games come first. */
function RangeMaxField({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (max: number | undefined) => void
}) {
  const [last, setLast] = useState(value ?? DEFAULT_RANGE_MAX)
  return (
    <LimitField
      label={m.setup_range_max()}
      unit={m.setup_range_max_unit()}
      info={m.setup_range_max_info()}
      limited={value !== undefined}
      count={value ?? last}
      onChange={({ limited, count }) => {
        setLast(count)
        onChange(limited ? count : undefined)
      }}
    />
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
