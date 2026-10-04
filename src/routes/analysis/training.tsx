import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAnalysisSession } from '@/features/review/sessionContext'

export const Route = createFileRoute('/analysis/training')({
  component: TrainingTab,
})

/**
 * The training itself is rendered by the page layout, kept mounted while other tabs are shown
 * (the session goes on where it was). This tab only sends back to the filters without one.
 */
function TrainingTab() {
  const { training } = useAnalysisSession()
  const search = Route.useSearch()
  if (!training) {
    return (
      <Navigate
        to="/analysis"
        search={{ lichess: search.lichess, chesscom: search.chesscom }}
        replace
      />
    )
  }
  return null
}
