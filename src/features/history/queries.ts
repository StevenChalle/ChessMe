import { infiniteQueryOptions } from '@tanstack/react-query'
import { fetchArchiveGames, fetchArchives } from '@/lib/chesscom/client'
import { shouldRetry } from '@/lib/http'
import { fetchGamesPage } from '@/lib/lichess/client'
import { nextPage, startFeed, type FeedFetchers, type HistoryAccount } from './feed'

const FETCHERS: FeedFetchers = {
  lichessPage: fetchGamesPage,
  chessComArchives: fetchArchives,
  chessComMonth: fetchArchiveGames,
}

export const historyKeys = {
  games: (accounts: HistoryAccount[]) =>
    [
      'history',
      ...accounts.map(({ source, username }) => `${source}:${username.toLowerCase()}`),
    ] as const,
}

/** Pages of 30 games, newest first; the next page is fetched only when asked for. */
export function historyQueryOptions(accounts: HistoryAccount[]) {
  return infiniteQueryOptions({
    queryKey: historyKeys.games(accounts),
    queryFn: ({ pageParam, signal }) => nextPage(pageParam, FETCHERS, signal),
    initialPageParam: startFeed(accounts),
    getNextPageParam: (last) => (last.hasMore ? last.state : undefined),
    staleTime: 5 * 60_000,
    retry: shouldRetry,
  })
}
