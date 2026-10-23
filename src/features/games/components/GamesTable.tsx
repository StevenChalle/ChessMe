import type { Color } from 'chessops'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ExternalLink as ExternalLinkIcon } from 'lucide-react'
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
  win: { label: m.result_win, className: 'text-win' },
  draw: { label: m.result_draw, className: 'text-muted-foreground' },
  loss: { label: m.result_loss, className: 'text-loss' },
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

/**
 * Narrow screens keep, by priority: `extra` (the mistakes), time control, links, result, platform
 * (its dot only on phones). The opponent and then the date give way first: tapping a row there
 * shows them under its time control.
 */
const HIDE = { date: 'hidden md:table-cell', opponent: 'hidden sm:table-cell' }

/** A column specific to one table (mistakes for the review). */
export type ExtraColumn<G> = { header: string; cell: (game: G) => ReactNode }

/**
 * Games, newest first: date, platform, time control, opponent, result, then `extra` if any. `action`
 * goes at the end of each row, before the link to the platform.
 */
export function GamesTable<G extends GameSummary>({
  games,
  extra,
  action,
}: {
  games: G[]
  extra?: ExtraColumn<G>
  action?: (game: G) => ReactNode
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={HIDE.date}>{m.review_col_date()}</TableHead>
          <TableHead>
            <span className="max-sm:sr-only">{m.review_col_platform()}</span>
          </TableHead>
          <TableHead>{m.review_col_time_control()}</TableHead>
          <TableHead className={HIDE.opponent}>{m.review_col_opponent()}</TableHead>
          <TableHead>{m.review_col_result()}</TableHead>
          {extra && <TableHead className="text-right">{extra.header}</TableHead>}
          <TableHead>
            <span className="sr-only">{m.review_col_link()}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => {
          const result = RESULTS[game.result]
          const key = `${game.source}-${game.id}`
          const open = expanded.has(key)
          // The whole row toggles the details where columns are hidden, except its links.
          const onRowClick = (event: MouseEvent) => {
            if ((event.target as Element).closest('a, button')) return
            if (window.matchMedia('(width < 48rem)').matches) toggle(key)
          }
          return (
            <TableRow key={key} onClick={onRowClick}>
              <TableCell className={cn('num whitespace-nowrap text-muted-foreground', HIDE.date)}>
                {formatDate(game.playedAt)}{' '}
                <span className="ml-1 text-muted-foreground/70">{formatTime(game.playedAt)}</span>
              </TableCell>
              <TableCell>
                <SourceLabel source={game.source} compact />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={m.games_row_details()}
                  onClick={() => toggle(key)}
                  className="mr-1 align-middle text-muted-foreground md:hidden"
                >
                  <ChevronDown
                    className={cn('size-3.5 transition-transform', open && 'rotate-180')}
                  />
                </button>
                {categoryLabel(game.category)}{' '}
                <span className="num text-muted-foreground">
                  {timeControlLabel(game.timeControl)}
                </span>
                {game.variant && (
                  <span className="block text-xs text-highlight">{variantLabel(game.variant)}</span>
                )}
                {open && (
                  <span className="mt-1 block space-y-0.5 md:hidden">
                    <span className="num block whitespace-nowrap text-muted-foreground">
                      {formatDate(game.playedAt)} {formatTime(game.playedAt)}
                    </span>
                    <span className="block sm:hidden">
                      <SourceLabel source={game.source} />
                    </span>
                    <span className="flex items-center gap-2 sm:hidden">
                      <SideSquare color={game.color} />
                      <span className="text-text-strong">{game.opponent.name}</span>
                      {game.opponent.rating !== undefined && (
                        <span className="num text-muted-foreground">{game.opponent.rating}</span>
                      )}
                    </span>
                  </span>
                )}
              </TableCell>
              <TableCell className={HIDE.opponent}>
                <span className="inline-flex items-center gap-2">
                  <SideSquare color={game.color} />
                  <span className="text-text-strong">{game.opponent.name}</span>
                  {game.opponent.rating !== undefined && (
                    <span className="num text-muted-foreground">{game.opponent.rating}</span>
                  )}
                </span>
              </TableCell>
              <TableCell className={result.className}>{result.label()}</TableCell>
              {extra && <TableCell className="text-right">{extra.cell(game)}</TableCell>}
              <TableCell className="text-right whitespace-nowrap">
                {action?.(game)}
                <a
                  href={game.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-block align-middle text-muted-foreground hover:text-primary"
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
