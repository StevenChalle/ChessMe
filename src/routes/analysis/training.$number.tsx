import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { TrainingSetup } from '@/features/training/components/TrainingSetup'

export const Route = createFileRoute('/analysis/training/$number')({
  component: TrainingTab,
})

/**
 * A training tab: its options until launched. The board itself is rendered by the page layout,
 * kept mounted while other tabs are shown (the training goes on where it was). Without such a
 * training (page reloaded, link shared, tab closed): back to the results, or the filters.
 */
function TrainingTab() {
  const { number } = Route.useParams()
  const { lichess, chesscom } = Route.useSearch()
  const { trainings, analysis } = useAnalysisSession()
  const tab = trainings.find((item) => String(item.number) === number)
  if (!tab) {
    return (
      <Navigate
        to={analysis.status === 'none' ? '/analysis' : '/analysis/run'}
        search={{ lichess, chesscom }}
        replace
      />
    )
  }
  return tab.phase.kind === 'options' ? <TrainingSetup tab={tab} /> : null
}
