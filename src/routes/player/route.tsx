import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PlayerHeader } from '@/features/player/components/PlayerHeader'
import { PlayerTabs } from '@/features/player/components/PlayerTabs'
import { saveRecentSearch } from '@/features/player/recentSearches'
import { hasAnyUsername, validatePlayerSearch } from '@/features/player/search'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
import { reviewableAccounts } from '@/features/review/accounts'
import { ReviewButtons } from '@/features/review/components/ReviewButtons'
import { chessComPlayerQueryOptions } from '@/lib/chesscom/queries'
import { formatOrList } from '@/lib/format'
import { lichessUserQueryOptions } from '@/lib/lichess/queries'
import { m } from '@/paraglide/messages'

/** /player?lichess=<name>&chesscom=<name>: either or both, names may differ. */
export const Route = createFileRoute('/player')({
  validateSearch: validatePlayerSearch,
  loaderDeps: ({ search }) => search,
  // prefetchQuery never throws: each source handles its own failure in the UI.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      deps.lichess && queryClient.prefetchQuery(lichessUserQueryOptions(deps.lichess)),
      deps.chesscom && queryClient.prefetchQuery(chessComPlayerQueryOptions(deps.chesscom)),
    ]),
  component: PlayerLayout,
  pendingComponent: () => <p className="text-muted-foreground">{m.player_loading()}</p>,
})

function PlayerLayout() {
  const usernames = Route.useSearch()
  const { states, linked, accounts, noAccount } = usePlayerAccounts(usernames)

  // Remember the search once at least one account is found, keeping only found accounts
  // (with their official casing) so typos never end up in the recent searches.
  const foundLichess =
    states.lichess.status === 'found' ? states.lichess.account.username : undefined
  const foundChessCom =
    states.chesscom.status === 'found' ? states.chesscom.account.username : undefined
  useEffect(() => {
    if (foundLichess || foundChessCom) {
      saveRecentSearch({ lichess: foundLichess, chesscom: foundChessCom })
    }
  }, [foundLichess, foundChessCom])

  if (!hasAnyUsername(usernames)) {
    return <p className="text-muted-foreground">{m.player_need_username()}</p>
  }

  if (noAccount) {
    const names = formatOrList(linked.map((source) => m.quoted({ text: usernames[source]! })))
    return <p className="text-muted-foreground">{m.player_not_found({ names })}</p>
  }

  return (
    <div className="space-y-6">
      <PlayerHeader
        accounts={accounts}
        actions={
          reviewableAccounts(accounts).accounts.length > 0 && (
            <ReviewButtons usernames={usernames} />
          )
        }
      />
      <PlayerTabs linked={linked} states={states} />
      <Outlet />
    </div>
  )
}
