import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ReviewRecap } from '@/features/review/components/ReviewRecap'
import { ReviewSetup } from '@/features/review/components/ReviewSetup'
import { isSelectionValid } from '@/features/review/selection'
import type { ReviewSettings } from '@/features/review/settings'
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

  // Enter in a field launches the analysis: right away if the games are known, else as soon as
  // they are (searching now rather than after the delay). Remembered with the filters it was
  // pressed on: changing them again cancels it.
  const launchFor = useRef<ReviewSettings | undefined>(undefined)
  useEffect(() => {
    if (launchFor.current !== draft || search.status === 'finding' || search.status === 'idle')
      return
    launchFor.current = undefined
    if (search.status === 'found' && search.found.games.length > 0) void launch()
  }, [draft, search, launch])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return
    event.preventDefault()
    if (!isSelectionValid(draft.selection)) return
    if (search.status === 'found') {
      if (search.found.games.length > 0) void launch()
      return
    }
    launchFor.current = draft
    if (canSearch && !analysisFetching) find()
  }

  return (
    <div className="space-y-6" onKeyDown={onKeyDown}>
      <ReviewSetup
        accounts={accounts}
        gameTotal={gameTotal}
        value={draft}
        onChange={setDraft}
        reference={analysisSettings}
      />
      {search.status === 'error' && <p className="text-bad">{m.search_failed()}</p>}
      {/* While the games are looked for again (or about to be), the box shows a loader. */}
      {(search.status === 'found' || search.status === 'finding' || canSearch) && (
        <ReviewRecap
          found={search.status === 'found' ? search.found : undefined}
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
