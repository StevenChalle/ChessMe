import { useQuery } from '@tanstack/react-query'
import { chessComPlayerQueryOptions } from '@/lib/chesscom/queries'
import type { ChessComPlayer } from '@/lib/chesscom/types'
import type { ApiSource } from '@/lib/http'
import { lichessUserQueryOptions } from '@/lib/lichess/queries'
import type { LichessUser } from '@/lib/lichess/types'
import type { PlayerUsernames } from './search'
import { fromChessCom, fromLichess, type AccountSummary } from './summary'

export type SourceState<T> =
  /** No username given for this platform */
  | { status: 'unlinked' }
  | { status: 'loading'; username: string }
  | { status: 'error'; username: string; error: Error }
  | { status: 'missing'; username: string }
  | { status: 'found'; username: string; data: T; account: AccountSummary }

function toState<T>(
  username: string | undefined,
  query: {
    status: 'pending' | 'error' | 'success'
    data: T | null | undefined
    error: Error | null
  },
  summarize: (data: T) => AccountSummary,
): SourceState<T> {
  if (!username) return { status: 'unlinked' }
  if (query.status === 'pending') return { status: 'loading', username }
  if (query.status === 'error') return { status: 'error', username, error: query.error! }
  if (query.data == null) return { status: 'missing', username }
  return { status: 'found', username, data: query.data, account: summarize(query.data) }
}

/**
 * Each platform is looked up with its own (optional) username, independently:
 * a missing or failing account on one side never breaks the other.
 */
export function usePlayerAccounts(usernames: PlayerUsernames) {
  const lichessQuery = useQuery(lichessUserQueryOptions(usernames.lichess))
  const chessComQuery = useQuery(chessComPlayerQueryOptions(usernames.chesscom))

  const lichess = toState<LichessUser>(usernames.lichess, lichessQuery, fromLichess)
  const chesscom = toState<ChessComPlayer>(usernames.chesscom, chessComQuery, fromChessCom)
  const states: Record<ApiSource, SourceState<unknown>> = { lichess, chesscom }
  const linked = (Object.keys(states) as ApiSource[]).filter(
    (source) => states[source].status !== 'unlinked',
  )
  const accounts = [lichess, chesscom].flatMap((state) =>
    state.status === 'found' ? [state.account] : [],
  )

  return {
    lichess,
    chesscom,
    states,
    /** Platforms the user asked for, in display order */
    linked,
    accounts,
    noAccount: linked.every((source) => states[source].status === 'missing'),
  }
}
