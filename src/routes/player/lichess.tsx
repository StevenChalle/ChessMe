import { createFileRoute } from '@tanstack/react-router'
import { LichessDetails } from '@/features/player/components/LichessDetails'

export const Route = createFileRoute('/player/lichess')({
  component: function LichessTab() {
    const usernames = Route.useSearch()
    return <LichessDetails usernames={usernames} />
  },
})
