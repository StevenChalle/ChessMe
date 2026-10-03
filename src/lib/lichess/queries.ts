import { queryOptions, skipToken } from '@tanstack/react-query'
import { orNullIfNotFound, shouldRetry } from '@/lib/http'
import { fetchUser } from './client'

export const lichessKeys = {
  user: (username: string) => ['lichess', 'user', username.toLowerCase()] as const,
}

/** Resolves to null when the account does not exist. Disabled without a username. */
export function lichessUserQueryOptions(username: string | undefined) {
  return queryOptions({
    queryKey: lichessKeys.user(username ?? ''),
    queryFn: username ? ({ signal }) => orNullIfNotFound(fetchUser(username, signal)) : skipToken,
    staleTime: 5 * 60_000,
    retry: shouldRetry,
  })
}
