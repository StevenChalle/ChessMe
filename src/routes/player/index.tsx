import { createFileRoute } from '@tanstack/react-router'
import { PlayerOverview } from '@/features/player/components/PlayerOverview'

export const Route = createFileRoute('/player/')({
  component: function OverviewTab() {
    const usernames = Route.useSearch()
    return <PlayerOverview usernames={usernames} />
  },
})
