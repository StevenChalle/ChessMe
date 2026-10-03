import { queryOptions, skipToken } from '@tanstack/react-query'
import { orNullIfNotFound, shouldRetry } from '@/lib/http'
import { fetchPlayer } from './client'

export const chessComKeys = {
  player: (username: string) => ['chesscom', 'player', username.toLowerCase()] as const,
}

/** Resolves to null when the account does not exist. Disabled without a username. */
export function chessComPlayerQueryOptions(username: string | undefined) {
  return queryOptions({
    queryKey: chessComKeys.player(username ?? ''),
    queryFn: username ? ({ signal }) => orNullIfNotFound(fetchPlayer(username, signal)) : skipToken,
    // Chess.com serves cached data that lags by a few hours anyway.
    staleTime: 15 * 60_000,
    retry: shouldRetry,
  })
}
