import type { Color } from 'chessops'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SourceLabel } from '@/features/player/components/SourceBadge'
import { categoryLabel } from '@/features/player/sources'
import { SOURCE_LABELS } from '@/features/player/summary'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { ReviewedGame } from '../analyze'
import { timeControlLabel, type GameResult } from '../games'

const RESULTS: Record<GameResult, { label: () => string; className: string }> = {
  win: { label: m.result_win, className: 'text-good' },
  draw: { label: m.result_draw, className: 'text-font-dim' },
  loss: { label: m.result_loss, className: 'text-bad' },
}

/** Small square showing which side the player had. */
function SideSquare({ color }: { color: Color }) {
  const label = color === 'white' ? m.played_white() : m.played_black()
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-block size-3 shrink-0 rounded-sm border border-border',
        color === 'white' ? 'bg-piece-white' : 'bg-piece-black',
      )}
    />
  )
}

/** The reviewed games, newest first, with the player's error count. */
export function ReviewTable({ games }: { games: ReviewedGame[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.review_col_date()}</TableHead>
          <TableHead>{m.review_col_platform()}</TableHead>
          <TableHead>{m.review_col_time_control()}</TableHead>
          <TableHead>{m.review_col_opponent()}</TableHead>
          <TableHead>{m.review_col_result()}</TableHead>
          <TableHead className="text-right">{m.review_col_errors()}</TableHead>
          <TableHead>
            <span className="sr-only">{m.review_col_link()}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => {
          const result = RESULTS[game.result]
          return (
            <TableRow key={`${game.source}-${game.id}`}>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDate(game.playedAt)}
              </TableCell>
              <TableCell>
                <SourceLabel source={game.source} />
              </TableCell>
              <TableCell>
                {categoryLabel(game.category)}{' '}
                <span className="text-muted-foreground tabular-nums">
                  {timeControlLabel(game.timeControl)}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <SideSquare color={game.color} />
                  <span className="text-font-clear">{game.opponent.name}</span>
                  {game.opponent.rating !== undefined && (
                    <span className="text-muted-foreground tabular-nums">
                      {game.opponent.rating}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className={result.className}>{result.label()}</TableCell>
              <TableCell
                className={cn(
                  'text-right text-base font-medium tabular-nums',
                  game.errors === 0 ? 'text-good' : 'text-bad',
                )}
              >
                {formatNumber(game.errors)}
              </TableCell>
              <TableCell>
                <a
                  href={game.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  title={m.view_on({ platform: SOURCE_LABELS[game.source] })}
                  aria-label={m.view_on({ platform: SOURCE_LABELS[game.source] })}
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
