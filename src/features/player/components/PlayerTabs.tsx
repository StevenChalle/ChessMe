import { Link } from '@tanstack/react-router'
import { LayoutGrid, List } from 'lucide-react'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { SourceState } from '../usePlayerAccounts'
import { SourceDot } from './SourceBadge'

// TanStack Router sets data-status="active" on the current link.
// Icons stay discreet: small and dimmed, in the tab's color.
const TAB_CLASS =
  'tab-etabli inline-flex shrink-0 items-center gap-2 px-1 pb-2.5 whitespace-nowrap transition-colors [&>svg]:size-3.5 [&>svg]:opacity-70'

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
    <nav className="flex gap-6 overflow-x-auto border-b" aria-label={m.tabs_label()}>
      <Link to="/player" search={true} activeOptions={{ exact: true }} className={TAB_CLASS}>
        <LayoutGrid aria-hidden />
        {m.tab_overview()}
      </Link>
      <Link to="/player/history" search={true} className={TAB_CLASS}>
        <List aria-hidden />
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
