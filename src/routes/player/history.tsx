import { createFileRoute } from '@tanstack/react-router'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
import { HistoryTab } from '@/features/history/components/HistoryTab'

export const Route = createFileRoute('/player/history')({
  component: function GamesHistoryTab() {
    const usernames = Route.useSearch()
    const { accounts } = usePlayerAccounts(usernames)
    // Found accounts only, with their official username; closed accounts have no games to list.
    const linked = accounts
      .filter((account) => !account.closed)
      .map(({ source, username }) => ({ source, username }))
    if (linked.length === 0) return null
    return <HistoryTab accounts={linked} />
  },
})
