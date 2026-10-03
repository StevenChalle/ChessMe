import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PlayerHeader } from '@/features/player/components/PlayerHeader'
import { PlayerTabs } from '@/features/player/components/PlayerTabs'
import { hasAnyUsername, validatePlayerSearch } from '@/features/player/search'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
import { chessComPlayerQueryOptions } from '@/lib/chesscom/queries'
import { lichessUserQueryOptions } from '@/lib/lichess/queries'

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
  pendingComponent: () => <p className="text-muted-foreground">Recherche des comptes…</p>,
})

function PlayerLayout() {
  const usernames = Route.useSearch()
  const { states, linked, accounts, noAccount } = usePlayerAccounts(usernames)

  if (!hasAnyUsername(usernames)) {
    return (
      <p className="text-muted-foreground">
        Renseigne au moins un pseudo pour lancer la recherche.
      </p>
    )
  }

  if (noAccount) {
    const names = linked.map((source) => `« ${usernames[source]} »`).join(' ni ')
    return <p className="text-muted-foreground">Aucun compte trouvé pour {names}.</p>
  }

  return (
    <div className="space-y-6">
      <PlayerHeader accounts={accounts} />
      <PlayerTabs linked={linked} states={states} />
      <Outlet />
    </div>
  )
}
