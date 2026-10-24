import { StarOff, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { ConfirmOptions } from '@/components/ConfirmDialog'
import { InfoTip } from '@/components/InfoTip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import { formatList, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { announceUnfavorite } from '../announce'
import {
  depthRange,
  getFavorites,
  playerAccounts,
  playerName,
  setFavorites,
  useFavorites,
  withoutFavorite,
  type FavoritePlayer,
  type Favorites,
} from '../favorites'

/**
 * The favorite players (added from their profile, removed with their cross), how many of their
 * latest games to keep analysed, and the deep option (docs/background-analysis.md). Changes apply
 * at once.
 */
export function FavoritesSettings({
  confirm,
}: {
  /** From outside the popover, whose content would unmount the dialog when it takes the focus */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}) {
  const favorites = useFavorites()
  if (!favorites) {
    return (
      <div className="space-y-0.5 text-sm">
        <p className="text-text-strong">{m.favorites_none()}</p>
        <p className="text-xs text-muted-foreground">{m.favorites_empty()}</p>
      </div>
    )
  }
  return <FavoritesChoices favorites={favorites} confirm={confirm} />
}

function FavoritesChoices({
  favorites,
  confirm,
}: {
  favorites: Favorites
  confirm: (options: ConfirmOptions) => Promise<boolean>
}) {
  const range = depthRange()
  // While dragging: shown at once, applied on release (a new depth restarts the analysis).
  const [dragged, setDragged] = useState<number | undefined>(undefined)
  const depth = dragged ?? favorites.depth
  const sliderId = useId()
  const deepId = useId()
  const position = (value: number) => ((value - range.min) / (range.max - range.min)) * 100
  const apply = (value: number) => {
    setDragged(undefined)
    if (value !== favorites.depth) setFavorites({ ...favorites, depth: value })
  }

  // Asked first: the background analysis of this player stops (what is saved stays).
  const remove = async (player: FavoritePlayer) => {
    const name = playerName(player)
    const confirmed = await confirm({
      icon: StarOff,
      title: m.favorite_remove_named_title({ player: name }),
      description: m.favorite_remove_body(),
      confirmLabel: m.favorite_remove_action(),
      cancelLabel: m.confirm_cancel(),
    })
    const current = getFavorites()
    if (!confirmed || !current) return
    const accounts = playerAccounts(player)
    setFavorites(withoutFavorite(current, accounts))
    announceUnfavorite(accounts)
  }

  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-0.5">
        {favorites.players.map((player) => {
          const accounts = playerAccounts(player)
          const name = playerName(player)
          const platforms = formatList(accounts.map(({ source }) => SOURCE_LABELS[source]))
          return (
            <li key={name.toLowerCase()} className="flex items-center gap-2">
              {/* The platforms as dots: the same name on both sites is one row. */}
              <span title={platforms} className="flex w-5 shrink-0 gap-1">
                {accounts.map(({ source }) => (
                  <SourceDot key={source} source={source} />
                ))}
                <span className="sr-only">{platforms}</span>
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-text-strong">{name}</span>
              <button
                type="button"
                aria-label={m.favorite_remove_named({ player: name })}
                title={m.favorite_remove_named({ player: name })}
                onClick={() => void remove(player)}
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
          checked={favorites.deep}
          onCheckedChange={(value) => setFavorites({ ...favorites, deep: value === true })}
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
