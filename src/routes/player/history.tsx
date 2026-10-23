import { createFileRoute } from '@tanstack/react-router'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
import { HistoryTab } from '@/features/history/components/HistoryTab'
import { ImportedGamesTab } from '@/features/import/components/ImportedGamesTab'

export const Route = createFileRoute('/player/history')({
  component: function GamesHistoryTab() {
    const search = Route.useSearch()
    return search.import ? (
      <ImportedGamesTab />
    ) : (
      <AccountsGames lichess={search.lichess} chesscom={search.chesscom} />
    )
  },
})

function AccountsGames(usernames: { lichess?: string; chesscom?: string }) {
  const { accounts } = usePlayerAccounts(usernames)
  // Found accounts only, with their official username; closed accounts have no games to list.
  const linked = accounts
    .filter((account) => !account.closed)
    .map(({ source, username }) => ({ source, username }))
  if (linked.length === 0) return null
  return (
    <HistoryTab
      accounts={linked}
      usernames={{ lichess: usernames.lichess, chesscom: usernames.chesscom }}
    />
  )
}
