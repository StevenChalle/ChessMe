import { queryOptions } from '@tanstack/react-query'
import { fetchUser, LichessError } from './client'

export const lichessKeys = {
  user: (username: string) => ['lichess', 'user', username.toLowerCase()] as const,
}

export function userQueryOptions(username: string) {
  return queryOptions({
    queryKey: lichessKeys.user(username),
    queryFn: ({ signal }) => fetchUser(username, signal),
    staleTime: 5 * 60_000,
    // Retrying a 404 or a 429 is pointless (and Lichess dislikes the latter).
    retry: (failureCount, error) =>
      !(error instanceof LichessError && (error.isNotFound || error.isRateLimited)) &&
      failureCount < 2,
  })
}
