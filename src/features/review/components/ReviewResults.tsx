import { Swords } from 'lucide-react'
import { useState } from 'react'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { GamesTable } from '@/features/games/components/GamesTable'
import { sourceErrorMessage } from '@/features/player/sources'
import { formatNumber } from '@/lib/format'
import { pageSlice } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { Mistake, ReviewedGame, ReviewOutcome } from '../analyze'

const RESULTS_PAGE_SIZE = 20

/**
 * The analysed games, paginated, with each game's errors and a button replaying them.
 * Replaying all the errors is in the page header.
 */
export function ReviewResults({
  outcome: { games, failures, criteria },
  onTrain,
}: {
  outcome: ReviewOutcome
  onTrain: (mistakes: Mistake[]) => void
}) {
  const [page, setPage] = useState(0)

  return (
    <div className="min-w-0 space-y-3">
      {failures.map(({ source, error }) => (
        <p key={source} className="text-sm text-bad">
          {sourceErrorMessage(source, error)}
        </p>
      ))}
      {games.length === 0 ? (
        <p className="text-muted-foreground">{m.review_no_games()}</p>
      ) : (
        <>
          <p className="text-right text-xs text-muted-foreground">
            {m.results_criteria({
              error: String(criteria.errorMinDrop),
              valid: String(criteria.validMaxDrop),
            })}
          </p>
          <GamesTable
            games={pageSlice(games, page, RESULTS_PAGE_SIZE)}
            extra={{
              header: m.review_col_errors(),
              cell: (game: ReviewedGame) => (
                <span className="inline-flex items-center justify-end gap-2">
                  <span
                    className={cn(
                      'text-base font-medium tabular-nums',
                      game.mistakes.length === 0 ? 'text-good' : 'text-bad',
                    )}
                  >
                    {formatNumber(game.mistakes.length)}
                  </span>
                  <Button
                    size="icon-xs"
                    disabled={game.mistakes.length === 0}
                    onClick={() => onTrain(game.mistakes)}
                    aria-label={m.replay_game()}
                    title={m.replay_game()}
                  >
                    <Swords />
                  </Button>
                </span>
              ),
            }}
          />
          <TablePagination
            page={page}
            pageSize={RESULTS_PAGE_SIZE}
            total={games.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
