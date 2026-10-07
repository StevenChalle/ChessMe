import { Play, RotateCcw } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { LimitField } from '@/components/LimitField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ERROR_RANGE } from '@/features/review/criteria'
import { ThresholdSlider } from '@/features/review/components/ThresholdSlider'
import { lichessMarkers } from '@/features/review/markers'
import { useAnalysisSession, type TrainingTab } from '@/features/review/sessionContext'
import { formatGameCount, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { mistakesByGame } from '../order'
import {
  DEFAULT_TRAINING_SETTINGS,
  loadTrainingSettings,
  toTrainingOptions,
  type TrainingSettings,
} from '../settings'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
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
        className="border-font-dim"
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <InfoTip text={info} />
    </div>
  )
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
  const games = mistakesByGame(tab.mistakes, options.minDrop)
  const positions = games.reduce((sum, game) => sum + game.length, 0)
  const limitValid =
    !settings.limitGames || (Number.isInteger(settings.gamesLimit) && settings.gamesLimit >= 1)
  const limited = settings.limitGames && limitValid && settings.gamesLimit < games.length
  const isDefault =
    !settings.interleaveGames &&
    !settings.shuffleWithinGame &&
    !settings.limitGames &&
    settings.gamesLimit === DEFAULT_TRAINING_SETTINGS.gamesLimit &&
    options.minDrop === tab.errorMinDrop

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
      <div className="space-y-6 rounded-md border border-border p-4">
        <Section title={m.training_setup_order()}>
          <CheckboxField
            label={m.training_setup_shuffle()}
            info={m.training_setup_shuffle_info()}
            checked={settings.shuffleWithinGame}
            onChange={(shuffleWithinGame) => update({ shuffleWithinGame })}
          />
          <CheckboxField
            label={m.training_setup_interleave()}
            info={m.training_setup_interleave_info()}
            checked={settings.interleaveGames}
            onChange={(interleaveGames) => update({ interleaveGames })}
          />
        </Section>

        <Section title={m.training_setup_positions()}>
          <LimitField
            label={m.training_setup_limit()}
            unit={m.setup_range_max_unit()}
            info={m.training_setup_limit_info()}
            limited={settings.limitGames}
            count={settings.gamesLimit}
            onChange={({ limited: limitGames, count }) => update({ limitGames, gamesLimit: count })}
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 p-4">
        <p className="text-font-clear">
          {positions === 0
            ? m.training_setup_none()
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
