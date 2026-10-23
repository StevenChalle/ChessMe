import { useId, useState } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import {
  depthsFor,
  mainAccounts,
  setMainProfile,
  useMainProfile,
  type MainProfile,
} from '../profile'

/**
 * The main accounts (set from a player's profile, not here), how many of their latest games to
 * keep analysed, and the deep option (docs/background-analysis.md). Changes apply at once.
 */
export function MainProfileSettings() {
  const profile = useMainProfile()
  if (!profile) return <p className="text-xs text-muted-foreground">{m.settings_main_empty()}</p>
  return <MainProfileChoices profile={profile} />
}

function MainProfileChoices({ profile }: { profile: MainProfile }) {
  const depths = depthsFor()
  // While dragging: shown at once, applied on release (a new depth restarts the analysis).
  const [dragged, setDragged] = useState<number | undefined>(undefined)
  const index = dragged ?? Math.max(depths.indexOf(profile.depth), 0)
  const sliderId = useId()
  const deepId = useId()

  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-1">
        {mainAccounts(profile).map(({ source, username }) => (
          <li key={source} className="flex items-center gap-2">
            <SourceDot source={source} />
            <span className="w-20 text-muted-foreground">{SOURCE_LABELS[source]}</span>
            <span className="truncate font-medium text-text-strong">{username}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={sliderId} className="text-xs font-normal text-muted-foreground">
            {m.settings_main_depth()}
          </Label>
          <span className="num font-medium text-text-strong">{formatNumber(depths[index]!)}</span>
        </div>
        <Slider
          id={sliderId}
          aria-label={m.settings_main_depth()}
          min={0}
          max={depths.length - 1}
          step={1}
          value={[index]}
          onValueChange={([value]) => setDragged(value)}
          onValueCommit={([value]) => {
            setDragged(undefined)
            const depth = depths[value!]
            if (depth !== undefined && depth !== profile.depth)
              setMainProfile({ ...profile, depth })
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={deepId}
          checked={profile.deep}
          onCheckedChange={(value) => setMainProfile({ ...profile, deep: value === true })}
          className="border-border-strong"
        />
        <Label htmlFor={deepId} className="font-normal text-text-strong">
          {m.settings_main_deep()}
        </Label>
        <InfoTip text={m.settings_main_deep_hint()} />
      </div>
    </div>
  )
}
