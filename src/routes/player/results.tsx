import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ReviewResults } from '@/features/review/components/ReviewResults'
import { ReviewSteps } from '@/features/review/components/ReviewSteps'
import { Stopwatch } from '@/features/review/components/Stopwatch'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/player/results')({
  component: ResultsTab,
})

/** The analysis: its steps while it runs, then the games and their errors. */
function ResultsTab() {
  const { analysis, trainGame } = useAnalysisSession()
  const search = Route.useSearch()

  // Nothing in memory (page reloaded, link shared): back to the filters. A review asked by the
  // link (start, game) is about to start.
  if (analysis.status === 'none') {
    if (search.start || search.game) return null
    return (
      <Navigate
        to="/player/analysis"
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
        <p className="text-loss">{m.review_failed()}</p>
      ) : (
        <ReviewResults outcome={analysis.outcome} onTrain={trainGame} />
      )}
      {analysis.status === 'running' && (
        <p className="text-sm text-muted-foreground">{m.analysis_keep_open()}</p>
      )}
      <Stopwatch
        clock={analysis.status === 'running' ? analysis.clock : undefined}
        durationMs={analysis.status === 'running' ? undefined : analysis.durationMs}
      />
    </div>
  )
}
