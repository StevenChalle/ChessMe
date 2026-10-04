import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PlayerHeader } from '@/features/player/components/PlayerHeader'
import { PlayerTabs } from '@/features/player/components/PlayerTabs'
import { hasAnyUsername, validatePlayerSearch } from '@/features/player/search'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
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

  if (!hasAnyUsername(usernames)) {
    return <p className="text-muted-foreground">{m.player_need_username()}</p>
  }

  if (noAccount) {
    const names = formatOrList(linked.map((source) => m.quoted({ text: usernames[source]! })))
    return <p className="text-muted-foreground">{m.player_not_found({ names })}</p>
  }

  return (
    <div className="space-y-6">
      <PlayerHeader accounts={accounts} />
      <PlayerTabs linked={linked} states={states} />
      <Outlet />
    </div>
  )
}
