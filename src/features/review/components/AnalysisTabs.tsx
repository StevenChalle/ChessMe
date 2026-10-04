import { Link } from '@tanstack/react-router'
import type { PlayerUsernames } from '@/features/player/search'
import { m } from '@/paraglide/messages'
import { useAnalysisSession } from '../sessionContext'

// Same look as the profile tabs; TanStack Router sets data-status="active" on the current link.
const TAB_CLASS =
  '-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-1 pb-2 text-sm transition-colors hover:text-font-clear data-[status=active]:border-highlight data-[status=active]:text-font-clear'

/** Filters are always there; the analysis and training tabs appear once there is one. */
export function AnalysisTabs({ usernames }: { usernames: PlayerUsernames }) {
  const { analysis, training } = useAnalysisSession()
  return (
    <nav className="flex gap-6 border-b" aria-label={m.analysis_tabs_label()}>
      <Link to="/analysis" search={usernames} activeOptions={{ exact: true }} className={TAB_CLASS}>
        {m.tab_filters()}
      </Link>
      {analysis.status !== 'none' && (
        <Link to="/analysis/run" search={usernames} className={TAB_CLASS}>
          {m.tab_analysis()}
        </Link>
      )}
      {training && (
        <Link to="/analysis/training" search={usernames} className={TAB_CLASS}>
          {m.tab_training()}
        </Link>
      )}
    </nav>
  )
}
