import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ReviewResults } from '@/features/review/components/ReviewResults'
import { ReviewSteps } from '@/features/review/components/ReviewSteps'
import { Stopwatch } from '@/features/review/components/Stopwatch'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/analysis/run')({
  component: AnalysisTab,
})

/** The analysis: its steps while it runs, then the games and their errors. */
function AnalysisTab() {
  const { analysis, train } = useAnalysisSession()
  const search = Route.useSearch()

  // Nothing in memory (page reloaded, link shared): back to the filters.
  if (analysis.status === 'none') {
    return (
      <Navigate
        to="/analysis"
        search={{ lichess: search.lichess, chesscom: search.chesscom }}
        replace
      />
    )
  }

  const single =
    analysis.settings.selection.scope.kind === 'latest' &&
    analysis.settings.selection.scope.count === 1
  return (
    <div className="space-y-3">
      {analysis.status === 'running' ? (
        <ReviewSteps progress={analysis.progress} single={single} />
      ) : analysis.status === 'error' ? (
        <p className="text-bad">{m.review_failed()}</p>
      ) : (
        <ReviewResults outcome={analysis.outcome} onTrain={(mistakes) => void train(mistakes)} />
      )}
      <Stopwatch
        startedAt={analysis.startedAt}
        endedAt={analysis.status === 'running' ? undefined : analysis.endedAt}
      />
    </div>
  )
}
