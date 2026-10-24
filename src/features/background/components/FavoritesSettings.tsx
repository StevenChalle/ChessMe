import { ChevronRight, X } from 'lucide-react'
import { Accordion } from 'radix-ui'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import type { ReviewAccount } from '@/features/review/fetch'
import { formatList, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import {
  playerAccounts,
  playerName,
  setFavorites,
  useFavorites,
  withOptions,
  type FavoriteOptions,
} from '../favorites'
import { FavoriteOptionsFields } from './FavoriteOptionsFields'

/**
 * The favorite players (added from their profile, removed with their cross), each folding open on
 * their own options, one at a time; the last one added is open at first, so the options are easy
 * to find (docs/background-analysis.md). Changes apply at once.
 */
export function FavoritesSettings({
  onRemove,
}: {
  /** Opens the removal dialog, outside the popover (whose content unmounts when it takes focus) */
  onRemove: (accounts: ReviewAccount[]) => void
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
  const keyOf = (index: number) => playerName(favorites.players[index]!).toLowerCase()

  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={keyOf(favorites.players.length - 1)}
      className="-mx-2 space-y-0.5 text-sm"
    >
      {favorites.players.map((player, index) => {
        const accounts = playerAccounts(player)
        const name = playerName(player)
        const platforms = formatList(accounts.map(({ source }) => SOURCE_LABELS[source]))
        return (
          <Accordion.Item key={keyOf(index)} value={keyOf(index)} className="group/favorite">
            <Accordion.Header className="flex items-center gap-1 rounded-sm pr-1 hover:bg-muted/60">
              <Accordion.Trigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 pl-2 text-left">
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/favorite:rotate-90"
                />
                {/* The platforms as dots: the same name on both sites is one row. */}
                <span title={platforms} className="flex w-5 shrink-0 gap-1">
                  {accounts.map(({ source }) => (
                    <SourceDot key={source} source={source} />
                  ))}
                  <span className="sr-only">{platforms}</span>
                </span>
                <span className="min-w-0 truncate font-medium text-text-strong">{name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {optionsSummary(player)}
                </span>
              </Accordion.Trigger>
              <button
                type="button"
                aria-label={m.favorite_remove_named({ player: name })}
                title={m.favorite_remove_named({ player: name })}
                onClick={() => onRemove(accounts)}
                className="rounded-sm p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-text-strong"
              >
                <X className="size-3.5" />
              </button>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="pt-2 pr-2 pb-3 pl-7.5">
                <FavoriteOptionsFields
                  options={player}
                  onChange={(options) => setFavorites(withOptions(favorites, index, options))}
                />
              </div>
            </Accordion.Content>
          </Accordion.Item>
        )
      })}
    </Accordion.Root>
  )
}

/** A favorite's options in a few words: "500 games · deep". */
function optionsSummary({ depth, deep }: FavoriteOptions): string {
  const count = formatNumber(depth)
  return deep ? m.favorite_summary_deep({ count }) : m.favorite_summary({ count })
}
