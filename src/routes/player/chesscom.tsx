import { createFileRoute } from '@tanstack/react-router'
import { ChessComDetails } from '@/features/player/components/ChessComDetails'

export const Route = createFileRoute('/player/chesscom')({
  component: function ChessComTab() {
    const usernames = Route.useSearch()
    return <ChessComDetails usernames={usernames} />
  },
})
