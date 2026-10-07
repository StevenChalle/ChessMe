import { Link } from '@tanstack/react-router'
import { History, Microscope, SlidersHorizontal, Swords, X } from 'lucide-react'
import type { PlayerUsernames } from '@/features/player/search'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { trainingTitle } from '@/features/training/title'
import { useAnalysisSession } from '../sessionContext'

// Same look as the profile tabs (discreet icons); TanStack Router sets data-status="active" on the
// current link. The bar scrolls sideways when the tabs overflow (several trainings on a phone):
// the underline sits on the bar's border instead of overlapping it, which a scroller would clip.
const TAB_CLASS =
  'inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-1 pb-2 text-sm whitespace-nowrap transition-colors hover:text-font-clear data-[status=active]:border-highlight data-[status=active]:text-font-clear [&>svg]:size-3.5 [&>svg]:opacity-70'

/**
 * Filters are always there; the analysis tab appears once there is one, then a closable tab per
 * training. Switching tabs keeps the scroll position (`resetScroll={false}`): a training tab
 * places its board itself.
 */
export function AnalysisTabs({ usernames }: { usernames: PlayerUsernames }) {
  const { analysis, analysisId, trainings, closeTraining } = useAnalysisSession()
  return (
    <nav
      className="flex [scrollbar-width:none] gap-6 overflow-x-auto border-b"
      aria-label={m.analysis_tabs_label()}
    >
      <Link
        resetScroll={false}
        to="/analysis"
        search={usernames}
        activeOptions={{ exact: true }}
        className={TAB_CLASS}
      >
        <SlidersHorizontal aria-hidden />
        {m.tab_filters()}
      </Link>
      {analysis.status !== 'none' && (
        <Link resetScroll={false} to="/analysis/run" search={usernames} className={TAB_CLASS}>
          <Microscope aria-hidden />
          {m.tab_analysis()}
        </Link>
      )}
      {trainings.map((tab) => {
        const title = trainingTitle(tab, trainings)
        // Its errors come from an analysis replaced since: dimmed, with a clock.
        const stale = tab.analysisId !== analysisId
        return (
          <span key={tab.number} className={cn('flex shrink-0 items-start', stale && 'opacity-60')}>
            <Link
              resetScroll={false}
              to="/analysis/training/$number"
              params={{ number: String(tab.number) }}
              search={usernames}
              title={stale ? m.training_stale() : undefined}
              className={TAB_CLASS}
            >
              {stale ? <History aria-hidden /> : <Swords aria-hidden />}
              {title}
            </Link>
            <button
              type="button"
              onClick={() => void closeTraining(tab.number)}
              aria-label={m.training_close({ title })}
              className="ml-0.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-font-clear"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
    </nav>
  )
}
