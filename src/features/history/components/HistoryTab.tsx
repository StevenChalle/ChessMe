import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Microscope, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GamesTable } from '@/features/games/components/GamesTable'
import type { GameSummary } from '@/features/games/normalize'
import type { PlayerUsernames } from '@/features/player/search'
import { sourceErrorMessage } from '@/features/player/sources'
import { gameRef } from '@/features/review/gameRef'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { HISTORY_PAGE_SIZE, type HistoryAccount } from '../feed'
import { historyKeys, historyQueryOptions } from '../queries'

/** Straight to the analysis of this game alone, then its training. */
function AnalyzeLink({ game, usernames }: { game: GameSummary; usernames: PlayerUsernames }) {
  return (
    <Button size="xs" asChild>
      <Link
        to="/player/results"
        search={{ ...usernames, game: gameRef(game) }}
        title={m.history_analyze_title()}
      >
        <Microscope data-icon="inline-start" />
        <span className="max-sm:sr-only">{m.history_analyze()}</span>
      </Link>
    </Button>
  )
}

/**
 * Every game of the linked accounts, newest first, 30 per page; older pages load on demand.
 * `usernames`: the accounts searched, for the links to the analysis.
 */
export function HistoryTab({
  accounts,
  usernames,
}: {
  accounts: HistoryAccount[]
  usernames: PlayerUsernames
}) {
  const queryClient = useQueryClient()
  const query = useInfiniteQuery(historyQueryOptions(accounts))
  const [pageIndex, setPageIndex] = useState(0)
  const pages = query.data?.pages ?? []
  const page = pages[pageIndex]
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
        <p key={source} className="text-sm text-loss">
          {sourceErrorMessage(source, error)}
        </p>
      ))}

      {query.isPending ? (
        <p className="text-muted-foreground">{m.loading()}</p>
      ) : query.isError && pages.length === 0 ? (
        <p className="text-loss">{m.history_failed()}</p>
      ) : !page || page.games.length === 0 ? (
        <p className="text-muted-foreground">{m.history_no_games()}</p>
      ) : (
        <div className="panel-etabli px-2">
          <GamesTable
            games={page.games}
            action={(game) => <AnalyzeLink game={game} usernames={usernames} />}
          />
        </div>
      )}
    </div>
  )
}
