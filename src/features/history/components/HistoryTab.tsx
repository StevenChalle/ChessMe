import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GamesTable } from '@/features/games/components/GamesTable'
import type { GameSummary } from '@/features/games/normalize'
import { sourceErrorMessage } from '@/features/player/sources'
import { formatNumber, formatSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  bufferedGames,
  HISTORY_PAGE_SIZE,
  withChessComRatingDiffs,
  type HistoryAccount,
} from '../feed'
import { historyKeys, historyQueryOptions } from '../queries'

/** "1532 (+8)": rating after the game, and the change when known (only rated games are listed). */
function RatingCell({ game }: { game: GameSummary }) {
  if (game.rating === undefined) return null
  const diff = game.ratingDiff
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums">
      <span className="text-font-clear">{game.rating}</span>
      {diff !== undefined && (
        <span
          className={cn(
            'text-sm font-medium',
            diff > 0 ? 'text-good' : diff < 0 ? 'text-bad' : 'text-muted-foreground',
          )}
        >
          {formatSigned(diff)}
        </span>
      )}
    </span>
  )
}

/** Every game of the linked accounts, newest first, 30 per page; older pages load on demand. */
export function HistoryTab({ accounts }: { accounts: HistoryAccount[] }) {
  const queryClient = useQueryClient()
  const query = useInfiniteQuery(historyQueryOptions(accounts))
  const [pageIndex, setPageIndex] = useState(0)
  const loadedPages = query.data?.pages
  const pages = loadedPages ?? []
  // Rating changes need the previous game of each pool: computed over everything fetched so far.
  const games = useMemo(() => {
    if (!loadedPages?.length) return []
    return withChessComRatingDiffs(
      loadedPages.flatMap((loaded) => loaded.games),
      bufferedGames(loadedPages.at(-1)!.state),
    )
  }, [loadedPages])
  const page = pages[pageIndex]
  const start = pages.slice(0, pageIndex).reduce((count, loaded) => count + loaded.games.length, 0)
  const pageGames = page ? games.slice(start, start + page.games.length) : []
  const failures = pages.at(-1)?.state.failures ?? []
  const canGoNext = pageIndex + 1 < pages.length || query.hasNextPage

  const goNext = async () => {
    if (pageIndex + 1 >= pages.length) {
      const result = await query.fetchNextPage()
      if (result.isError) return
    }
    setPageIndex((index) => index + 1)
  }
  const update = async () => {
    setPageIndex(0)
    await queryClient.resetQueries({ queryKey: historyKeys.games(accounts) })
  }

  const from = pageIndex * HISTORY_PAGE_SIZE + 1
  const to = pageIndex * HISTORY_PAGE_SIZE + (page?.games.length ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {page && page.games.length > 0
            ? m.history_range({ from: formatNumber(from), to: formatNumber(to) })
            : null}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={update} disabled={query.isFetching}>
            <RefreshCw
              data-icon="inline-start"
              className={cn(query.isRefetching || query.isPending ? 'animate-spin' : undefined)}
            />
            {m.history_update()}
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((index) => index - 1)}
            aria-label={m.history_previous()}
            title={m.history_previous()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!canGoNext || query.isFetchingNextPage}
            onClick={goNext}
            aria-label={m.history_next()}
            title={m.history_next()}
          >
            {query.isFetchingNextPage ? <RefreshCw className="animate-spin" /> : <ChevronRight />}
          </Button>
        </div>
      </div>

      {failures.map(({ source, error }) => (
        <p key={source} className="text-sm text-bad">
          {sourceErrorMessage(source, error)}
        </p>
      ))}

      {query.isPending ? (
        <p className="text-muted-foreground">{m.loading()}</p>
      ) : query.isError && pages.length === 0 ? (
        <p className="text-bad">{m.history_failed()}</p>
      ) : !page || page.games.length === 0 ? (
        <p className="text-muted-foreground">{m.history_no_games()}</p>
      ) : (
        <div className="rounded-md bg-card px-2">
          <GamesTable
            games={pageGames}
            extra={{ header: m.history_col_rating(), cell: (game) => <RatingCell game={game} /> }}
          />
        </div>
      )}
    </div>
  )
}
