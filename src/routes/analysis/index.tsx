import { createFileRoute } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewRecap } from '@/features/review/components/ReviewRecap'
import { ReviewSetup } from '@/features/review/components/ReviewSetup'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/analysis/')({
  component: FiltersTab,
})

/** Filters and options; the games found show up below, with the button launching the analysis. */
function FiltersTab() {
  const {
    accounts,
    gameCounts,
    draft,
    setDraft,
    search,
    analysis,
    draftChanged,
    find,
    launch,
    restoreDraft,
  } = useAnalysisSession()

  return (
    <div className="space-y-6">
      {draftChanged && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{m.restore_filters_hint()}</span>
          <Button variant="outline" size="sm" onClick={restoreDraft}>
            <RotateCcw data-icon="inline-start" />
            {m.restore_filters()}
          </Button>
        </div>
      )}
      <ReviewSetup
        accounts={accounts}
        gameCounts={gameCounts}
        value={draft}
        onChange={setDraft}
        finding={search.status === 'finding'}
        onFind={find}
      />
      {search.status === 'error' && <p className="text-bad">{m.search_failed()}</p>}
      {search.status === 'found' && (
        <ReviewRecap
          found={search.found}
          criteria={search.settings.criteria}
          onLaunch={() => void launch()}
        />
      )}
      {analysis.status === 'running' && (
        <p className="text-sm text-muted-foreground">{m.analysis_running_note()}</p>
      )}
    </div>
  )
}
