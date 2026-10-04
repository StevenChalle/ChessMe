import { Link } from '@tanstack/react-router'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { SourceState } from '../usePlayerAccounts'
import { SourceDot } from './SourceBadge'

// TanStack Router sets data-status="active" on the current link.
const TAB_CLASS =
  '-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-1 pb-2 text-sm transition-colors hover:text-font-clear data-[status=active]:border-highlight data-[status=active]:text-font-clear'

const SOURCE_TABS = {
  lichess: { to: '/player/lichess', label: 'Lichess' },
  chesscom: { to: '/player/chesscom', label: 'Chess.com' },
} as const

export function PlayerTabs({
  linked,
  states,
}: {
  linked: ApiSource[]
  states: Record<ApiSource, SourceState<unknown>>
}) {
  return (
    <nav className="flex gap-6 border-b" aria-label={m.tabs_label()}>
      <Link to="/player" search={true} activeOptions={{ exact: true }} className={TAB_CLASS}>
        {m.tab_overview()}
      </Link>
      <Link to="/player/history" search={true} className={TAB_CLASS}>
        {m.tab_history()}
      </Link>
      {linked.map((source) => {
        const unavailable = states[source].status === 'missing' || states[source].status === 'error'
        return (
          <Link
            key={source}
            to={SOURCE_TABS[source].to}
            search={true}
            className={cn(TAB_CLASS, unavailable && 'opacity-50')}
          >
            <SourceDot source={source} />
            {SOURCE_TABS[source].label}
          </Link>
        )
      })}
    </nav>
  )
}
