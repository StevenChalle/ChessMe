import { Link } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatGameCount } from '@/lib/format'
import { m } from '@/paraglide/messages'
import type { ImportedGames } from '../store'

/**
 * Imported games' header, as a profile's: the player's names (those chosen at import, leading to
 * the games), how many games, and `actions` on the right.
 */
export function ImportHeader({
  imported,
  actions,
}: {
  imported: ImportedGames
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-md bg-card text-muted-foreground">
          <FileText aria-hidden className="size-6" />
        </span>
        <div>
          <h1>
            <Link to="/player/history" search={{ import: true }} className="hover:text-primary">
              {imported.names.join(' / ')}
            </Link>
          </h1>
          <p className="text-sm text-muted-foreground">
            {m.import_header_games({ games: formatGameCount(imported.games.length) })}
          </p>
        </div>
      </div>
      {actions}
    </div>
  )
}
