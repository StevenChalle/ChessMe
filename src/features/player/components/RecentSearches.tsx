import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { useRecentSearches } from '../recentSearches'
import type { PlayerUsernames } from '../search'
import { SourceDot } from './SourceBadge'

const RECENT_LIMIT = 3

/** Last profile searches, one click to reopen them. Hidden until there is at least one. */
export function RecentSearches({ className }: { className?: string }) {
  const { searches, remove } = useRecentSearches(RECENT_LIMIT)
  if (searches.length === 0) return null

  return (
    <section className={cn('space-y-2', className)}>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {m.recent_searches()}
      </h2>
      <ul className="space-y-0.5">
        {searches
          .map(({ lichess, chesscom }) => ({ lichess, chesscom }))
          .map((usernames) => (
            <li
              key={`${usernames.lichess ?? ''}|${usernames.chesscom ?? ''}`}
              className="group flex items-center rounded-md transition-colors hover:bg-muted"
            >
              <Link
                to="/player"
                search={usernames}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 px-2 py-1.5 text-sm text-font-clear"
              >
                <AccountNames usernames={usernames} />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => remove(usernames)}
                aria-label={m.recent_remove({ names: describe(usernames) })}
                title={m.recent_remove({ names: describe(usernames) })}
                // Always visible on touch screens, revealed on hover elsewhere
                className="mr-1 text-muted-foreground group-hover:opacity-100 focus-visible:opacity-100 md:opacity-0"
              >
                <X />
              </Button>
            </li>
          ))}
      </ul>
    </section>
  )
}

function describe(usernames: PlayerUsernames): string {
  return [usernames.lichess, usernames.chesscom].filter(Boolean).join(' / ')
}

/** "● ● name" when both accounts share a name, "● a  ● b" otherwise. */
function AccountNames({ usernames }: { usernames: PlayerUsernames }) {
  const { lichess, chesscom } = usernames
  if (lichess && chesscom && lichess.toLowerCase() === chesscom.toLowerCase()) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <SourceDot source="lichess" />
        <SourceDot source="chesscom" className="-ml-1" />
        {lichess}
      </span>
    )
  }
  const entries = (['lichess', 'chesscom'] as ApiSource[]).flatMap((source) => {
    const name = usernames[source]
    return name ? [{ source, name }] : []
  })
  return entries.map(({ source, name }) => (
    <span key={source} className="inline-flex min-w-0 items-center gap-1.5">
      <SourceDot source={source} />
      <span className="truncate">{name}</span>
    </span>
  ))
}
