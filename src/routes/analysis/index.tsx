import { createFileRoute } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { ReviewRecap } from '@/features/review/components/ReviewRecap'
import { ReviewSetup } from '@/features/review/components/ReviewSetup'
import { isSelectionValid } from '@/features/review/selection'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/analysis/')({
  component: FiltersTab,
})

/** Time to wait after the last change before searching (typing a number, clicking chips…). */
const SEARCH_DELAY_MS = 400

/**
 * Filters and options; the games they match show up below (searched again after every change),
 * with the button launching the analysis.
 */
function FiltersTab() {
  const { accounts, gameTotal, draft, setDraft, search, analysis, analysisSettings, find, launch } =
    useAnalysisSession()

  // While the analysis fetches its games, wait: one Lichess request at a time.
  const analysisFetching = analysis.status === 'running' && analysis.progress.phase === 'fetching'
  const canSearch = search.status === 'idle' && isSelectionValid(draft.selection)
  useEffect(() => {
    if (!canSearch || analysisFetching) return
    const timer = setTimeout(find, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [canSearch, analysisFetching, find])

  return (
    <div className="space-y-6">
      <ReviewSetup
        accounts={accounts}
        gameTotal={gameTotal}
        value={draft}
        onChange={setDraft}
        reference={analysisSettings}
      />
      {search.status === 'finding' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {m.setup_finding()}
        </p>
      )}
      {search.status === 'error' && <p className="text-bad">{m.search_failed()}</p>}
      {search.status === 'found' && (
        <ReviewRecap
          found={search.found}
          criteria={draft.criteria}
          onLaunch={() => void launch()}
        />
      )}
      {analysis.status === 'running' && (
        <p className="text-sm text-muted-foreground">{m.analysis_running_note()}</p>
      )}
    </div>
  )
}
