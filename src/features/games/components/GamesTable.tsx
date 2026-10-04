import type { Color } from 'chessops'
import type { ReactNode } from 'react'
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
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  timeControlLabel,
  variantLabel,
  type GameResult,
  type GameSummary,
} from '@/features/games/normalize'

const RESULTS: Record<GameResult, { label: () => string; className: string }> = {
  win: { label: m.result_win, className: 'text-good' },
  draw: { label: m.result_draw, className: 'text-font-dim' },
  loss: { label: m.result_loss, className: 'text-bad' },
}

/** Small square showing which side the player had. */
export function SideSquare({ color, className }: { color: Color; className?: string }) {
  const label = color === 'white' ? m.played_white() : m.played_black()
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-block size-3 shrink-0 rounded-sm border border-border',
        color === 'white' ? 'bg-piece-white' : 'bg-piece-black',
        className,
      )}
    />
  )
}

/** A column specific to one table (mistakes for the review, rating for the history). */
export type ExtraColumn<G> = { header: string; cell: (game: G) => ReactNode }

/** Games, newest first: date, platform, time control, opponent, result, then `extra`. */
export function GamesTable<G extends GameSummary>({
  games,
  extra,
}: {
  games: G[]
  extra: ExtraColumn<G>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.review_col_date()}</TableHead>
          <TableHead>{m.review_col_platform()}</TableHead>
          <TableHead>{m.review_col_time_control()}</TableHead>
          <TableHead>{m.review_col_opponent()}</TableHead>
          <TableHead>{m.review_col_result()}</TableHead>
          <TableHead className="text-right">{extra.header}</TableHead>
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
              <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                {formatDate(game.playedAt)}{' '}
                <span className="ml-1 text-muted-foreground/70">{formatTime(game.playedAt)}</span>
              </TableCell>
              <TableCell>
                <SourceLabel source={game.source} />
              </TableCell>
              <TableCell>
                {categoryLabel(game.category)}{' '}
                <span className="text-muted-foreground tabular-nums">
                  {timeControlLabel(game.timeControl)}
                </span>
                {game.variant && (
                  <span className="block text-xs text-brag">{variantLabel(game.variant)}</span>
                )}
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
              <TableCell className="text-right">{extra.cell(game)}</TableCell>
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
