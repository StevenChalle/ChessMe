import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import { formatList, formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  depthRange,
  mainAccounts,
  setMainProfile,
  useMainProfile,
  withoutMainAccount,
  type MainProfile,
} from '../profile'

/**
 * The main accounts (set from a player's profile, dropped with their cross), how many of their
 * latest games to keep analysed, and the deep option (docs/background-analysis.md). Changes apply
 * at once.
 */
export function MainProfileSettings() {
  const profile = useMainProfile()
  if (!profile) {
    return (
      <div className="space-y-0.5 text-sm">
        <p className="text-text-strong">{m.settings_main_unset()}</p>
        <p className="text-xs text-muted-foreground">{m.settings_main_empty()}</p>
      </div>
    )
  }
  return <MainProfileChoices profile={profile} />
}

/** The main accounts, one row per name: the same name on Lichess and Chess.com is one row. */
function accountRows(profile: MainProfile): { username: string; sources: ApiSource[] }[] {
  const rows: { username: string; sources: ApiSource[] }[] = []
  for (const { source, username } of mainAccounts(profile)) {
    const row = rows.find((item) => item.username.toLowerCase() === username.toLowerCase())
    if (row) row.sources.push(source)
    else rows.push({ username, sources: [source] })
  }
  return rows
}

function MainProfileChoices({ profile }: { profile: MainProfile }) {
  const range = depthRange()
  // While dragging: shown at once, applied on release (a new depth restarts the analysis).
  const [dragged, setDragged] = useState<number | undefined>(undefined)
  const depth = dragged ?? profile.depth
  const sliderId = useId()
  const deepId = useId()
  const position = (value: number) => ((value - range.min) / (range.max - range.min)) * 100
  const apply = (value: number) => {
    setDragged(undefined)
    if (value !== profile.depth) setMainProfile({ ...profile, depth: value })
  }

  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-0.5">
        {accountRows(profile).map(({ username, sources }) => {
          const platforms = formatList(sources.map((source) => SOURCE_LABELS[source]))
          return (
            <li key={username.toLowerCase()} className="flex items-center gap-2">
              {/* The platforms as dots: the same name on both sites is one row. */}
              <span title={platforms} className="flex w-5 shrink-0 gap-1">
                {sources.map((source) => (
                  <SourceDot key={source} source={source} />
                ))}
                <span className="sr-only">{platforms}</span>
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-text-strong">
                {username}
              </span>
              <button
                type="button"
                aria-label={m.settings_main_drop({ account: username })}
                title={m.settings_main_drop({ account: username })}
                onClick={() =>
                  setMainProfile(
                    sources.reduce<MainProfile | undefined>(
                      (rest, source) => rest && withoutMainAccount(rest, source),
                      profile,
                    ),
                  )
                }
                className="rounded-sm p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-text-strong"
              >
                <X className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={sliderId} className="text-xs font-normal text-muted-foreground">
            {m.settings_main_depth()}
          </Label>
          <span className="num font-medium text-text-strong">{formatNumber(depth)}</span>
        </div>
        <Slider
          id={sliderId}
          aria-label={m.settings_main_depth()}
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
