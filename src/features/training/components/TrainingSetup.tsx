import { Play, RotateCcw } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { LimitField } from '@/components/LimitField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CHIP_CLASS } from '@/components/chip'
import { Expandable, ExpandableGroup } from '@/components/Expandable'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import type { Mistake } from '@/features/review/analyze'
import { THEME_LABELS } from '@/features/review/themeLabels'
import { OPENING_MOVES, THEMES, themeCounts, type Theme } from '@/features/review/themes'
import { ERROR_RANGE } from '@/features/review/criteria'
import { ThresholdSlider } from '@/features/review/components/ThresholdSlider'
import { lichessMarkers } from '@/features/review/markers'
import { useAnalysisSession, type TrainingTab } from '@/features/review/sessionContext'
import { formatGameCount, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { keepsMistake, mistakesByGame, type MistakeFilter } from '../order'
import {
  DEFAULT_TRAINING_SETTINGS,
  loadTrainingSettings,
  toTrainingOptions,
  type TrainingSettings,
} from '../settings'

function Section({ title, info, children }: { title: string; info?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="label-etabli mb-3 flex items-center gap-1.5">
        {title}
        {info && <InfoTip text={info} />}
      </legend>
      {children}
    </fieldset>
  )
}

function CheckboxField({
  label,
  info,
  checked,
  onChange,
}: {
  label: string
  info: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="border-border-strong"
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <InfoTip text={info} />
    </div>
  )
}

/**
 * A chip per theme, with how many errors it would leave: the errors kept by the other options and
 * the themes already checked, having this theme too (checked ones show what is kept). Checking
 * one narrows the selection; a chip that would leave nothing is disabled.
 */
function ThemeChips({
  mistakes,
  options,
  onChange,
}: {
  mistakes: Mistake[]
  options: MistakeFilter
  onChange: (themes: Theme[]) => void
}) {
  const kept = mistakes.filter((mistake) => keepsMistake(mistake, options))
  const counts = themeCounts(kept, options.openingMoves)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {THEMES.map((theme) => {
        const on = options.themes.includes(theme)
        const count = on ? kept.length : counts[theme]
        const { label, info } = THEME_LABELS[theme]
        return (
          <span key={theme} className="inline-flex items-center gap-1">
            <Toggle
              size="sm"
              pressed={on}
              disabled={!on && count === 0}
              onPressedChange={(pressed) =>
                onChange(
                  pressed
                    ? THEMES.filter((item) => item === theme || options.themes.includes(item))
                    : options.themes.filter((item) => item !== theme),
                )
              }
              className={CHIP_CLASS}
            >
              {label()}
              <span className="num text-muted-foreground">{formatNumber(count)}</span>
            </Toggle>
            <InfoTip text={info()} />
          </span>
        )
      })}
    </div>
  )
}

/** How many moves count as the opening (its theme), 1 to 20. */
function OpeningMovesField({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const label = m.training_setup_opening_moves({ move: String(value) })
  return (
    <div className="max-w-xs space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Slider
        min={OPENING_MOVES.min}
        max={OPENING_MOVES.max}
        step={1}
        value={[value]}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        aria-label={label}
      />
    </div>
  )
}

/** The themes checked, or "all". */
function themesSummary(themes: Theme[]): string {
  return themes.length > 0
    ? themes.map((theme) => THEME_LABELS[theme].label()).join(', ')
    : m.training_summary_all_errors()
}

/** The advanced options changed from the defaults, or "default options". */
function advancedSummary(
  settings: TrainingSettings,
  minDrop: number,
  errorMinDrop: number,
): string {
  const parts: string[] = []
  if (settings.interleaveGames) parts.push(m.training_summary_interleave())
  if (settings.shuffleWithinGame) parts.push(m.training_summary_shuffle())
  if (settings.limitGames) {
    parts.push(m.training_summary_max({ items: formatGameCount(settings.gamesLimit) }))
  }
  if (settings.limitPositions) {
    const count = settings.positionsLimit
    parts.push(
      m.training_summary_max({
        items: m.positions_count({ count, formatted: formatNumber(count) }),
      }),
    )
  }
  if (minDrop !== errorMinDrop) parts.push(m.training_summary_min_drop({ value: String(minDrop) }))
  return parts.length > 0 ? parts.join(' · ') : m.training_summary_default()
}

/**
 * The options of a training tab, before it starts: the order of the positions, how many games,
 * how serious the errors. Starts from the options last launched; launching remembers them.
 */
export function TrainingSetup({ tab }: { tab: TrainingTab }) {
  const { launchTraining } = useAnalysisSession()
  const [settings, setSettings] = useState<TrainingSettings>(loadTrainingSettings)
  const update = (change: Partial<TrainingSettings>) => setSettings({ ...settings, ...change })

  const options = toTrainingOptions(settings, tab.errorMinDrop)
  const games = mistakesByGame(tab.mistakes, options)
  const positions = games.reduce((sum, game) => sum + game.length, 0)
  const validCount = (limited: boolean, count: number) =>
    !limited || (Number.isInteger(count) && count >= 1)
  const limitValid =
    validCount(settings.limitGames, settings.gamesLimit) &&
    validCount(settings.limitPositions, settings.positionsLimit)
  const limited = settings.limitGames && limitValid && settings.gamesLimit < games.length
  const positionsLimited =
    settings.limitPositions && limitValid && settings.positionsLimit < positions
  const themesDefault =
    settings.themes.length === 0 && settings.openingMoves === DEFAULT_TRAINING_SETTINGS.openingMoves
  const advancedDefault =
    !settings.interleaveGames &&
    !settings.shuffleWithinGame &&
    !settings.limitGames &&
    settings.gamesLimit === DEFAULT_TRAINING_SETTINGS.gamesLimit &&
    !settings.limitPositions &&
    settings.positionsLimit === DEFAULT_TRAINING_SETTINGS.positionsLimit &&
    options.minDrop === tab.errorMinDrop
  const isDefault = themesDefault && advancedDefault

  const canLaunch = positions > 0 && limitValid
  const launch = () => launchTraining(tab.number, settings)

  return (
    // Enter in a field launches the training.
    <div
      className="space-y-6"
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return
        event.preventDefault()
        if (canLaunch) launch()
      }}
    >
      <ExpandableGroup defaultValue="themes">
        <Expandable
          value="themes"
          title={m.training_setup_themes()}
          summary={themesSummary(settings.themes)}
          defaults={{
            disabled: themesDefault,
            onClick: () =>
              update({ themes: [], openingMoves: DEFAULT_TRAINING_SETTINGS.openingMoves }),
          }}
        >
          <ThemeChips
            mistakes={tab.mistakes}
            options={options}
            onChange={(themes) => update({ themes })}
          />

          {/* Settings of the checked themes that have some (only the opening, for now). */}
          {settings.themes.includes('opening') && (
            <Section title={m.training_setup_theme_options()}>
              <OpeningMovesField
                value={settings.openingMoves}
                onChange={(openingMoves) => update({ openingMoves })}
              />
            </Section>
          )}
        </Expandable>

        <Expandable
          value="advanced"
          title={m.training_setup_advanced()}
          summary={advancedSummary(settings, options.minDrop, tab.errorMinDrop)}
          defaults={{
            disabled: advancedDefault,
            onClick: () =>
              update({
                interleaveGames: false,
                shuffleWithinGame: false,
                limitGames: false,
                gamesLimit: DEFAULT_TRAINING_SETTINGS.gamesLimit,
                limitPositions: false,
                positionsLimit: DEFAULT_TRAINING_SETTINGS.positionsLimit,
                minDrop: undefined,
              }),
          }}
        >
          <Section title={m.training_setup_order()}>
            <CheckboxField
              label={m.training_setup_interleave()}
              info={m.training_setup_interleave_info()}
              checked={settings.interleaveGames}
              onChange={(interleaveGames) => update({ interleaveGames })}
            />
            <CheckboxField
              label={m.training_setup_shuffle()}
              info={m.training_setup_shuffle_info()}
              checked={settings.shuffleWithinGame}
              onChange={(shuffleWithinGame) => update({ shuffleWithinGame })}
            />
          </Section>

          <Section title={m.training_setup_positions()}>
            <LimitField
              label={m.training_setup_limit()}
              unit={m.setup_range_max_unit()}
              info={m.training_setup_limit_info()}
              limited={settings.limitGames}
              count={settings.gamesLimit}
              onChange={({ limited: limitGames, count }) =>
                update({ limitGames, gamesLimit: count })
              }
            />
            <LimitField
              label={m.training_setup_limit()}
              unit={m.training_setup_positions_unit()}
              info={m.training_setup_limit_positions_info()}
              limited={settings.limitPositions}
              count={settings.positionsLimit}
              onChange={({ limited: limitPositions, count }) =>
                update({ limitPositions, positionsLimit: count })
              }
            />
            <div className="max-w-xl pt-2">
              <ThresholdSlider
                label={m.training_setup_min_drop()}
                hint={m.training_setup_min_drop_hint({ value: String(options.minDrop) })}
                value={options.minDrop}
                range={{ min: tab.errorMinDrop, max: ERROR_RANGE.max }}
                markers={lichessMarkers()}
                note={m.setup_markers_note()}
                onChange={(minDrop) => update({ minDrop })}
              />
            </div>
          </Section>
        </Expandable>
      </ExpandableGroup>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 p-4">
        <p className="text-text-strong">
          {positions === 0
            ? m.training_setup_none()
            : positionsLimited
              ? m.training_setup_recap_positions_limited({
                  positions: m.positions_count({
                    count: settings.positionsLimit,
                    formatted: formatNumber(settings.positionsLimit),
                  }),
                  total: formatNumber(positions),
                })
              : limited
                ? m.training_setup_recap_limited({
                    games: formatGameCount(settings.gamesLimit),
                    total: formatNumber(games.length),
                  })
                : m.training_setup_recap({
                    positions: m.positions_count({
                      count: positions,
                      formatted: formatNumber(positions),
                    }),
                    games: formatGameCount(games.length),
                  })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={isDefault}
            onClick={() => setSettings(DEFAULT_TRAINING_SETTINGS)}
            className="text-muted-foreground"
          >
            <RotateCcw data-icon="inline-start" />
            {m.setup_reset_defaults()}
          </Button>
          <Button size="lg" disabled={!canLaunch} onClick={launch}>
            <Play data-icon="inline-start" />
            {m.training_setup_launch()}
          </Button>
        </div>
      </div>
    </div>
  )
}
