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

/** Score as on a scoresheet (1, ½, 0) next to the word: never color alone. */
const RESULTS: Record<GameResult, { label: () => string; score: string; className: string }> = {
  win: { label: m.result_win, score: '1', className: 'text-win' },
  draw: { label: m.result_draw, score: '½', className: 'text-muted-foreground' },
  loss: { label: m.result_loss, score: '0', className: 'text-loss' },
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
              <TableCell className="num whitespace-nowrap text-muted-foreground">
                {formatDate(game.playedAt)}{' '}
                <span className="ml-1 text-muted-foreground/70">{formatTime(game.playedAt)}</span>
              </TableCell>
              <TableCell>
                <SourceLabel source={game.source} />
              </TableCell>
              <TableCell>
                {categoryLabel(game.category)}{' '}
                <span className="num text-muted-foreground">
                  {timeControlLabel(game.timeControl)}
                </span>
                {game.variant && (
                  <span className="block text-xs text-highlight">{variantLabel(game.variant)}</span>
                )}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <SideSquare color={game.color} />
                  <span className="text-text-strong">{game.opponent.name}</span>
                  {game.opponent.rating !== undefined && (
                    <span className="num text-muted-foreground">{game.opponent.rating}</span>
                  )}
                </span>
              </TableCell>
              <TableCell className={result.className}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-flex size-4 items-center justify-center rounded-[2px] border border-current font-mono text-[10px] leading-none font-bold"
                  >
                    {result.score}
                  </span>
                  {result.label()}
                </span>
              </TableCell>
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
