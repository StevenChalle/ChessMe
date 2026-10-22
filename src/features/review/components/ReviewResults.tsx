import { Swords } from 'lucide-react'
import { useState } from 'react'
import { FeedbackNudge } from '@/components/FeedbackLink'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { GamesTable } from '@/features/games/components/GamesTable'
import { sourceErrorMessage } from '@/features/player/sources'
import { formatNumber } from '@/lib/format'
import { pageSlice } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { Mistake, ReviewedGame, ReviewOutcome } from '../analyze'
import { ThemeBars } from './ThemeBars'
import { TrainingPrompt } from './TrainingPrompt'

const RESULTS_PAGE_SIZE = 20

/**
 * The analysed games, paginated, with each game's errors and a button replaying them.
 * Below them, training on all the errors (TrainingPrompt).
 */
export function ReviewResults({
  outcome,
  onTrain,
}: {
  outcome: ReviewOutcome
  onTrain: (mistakes: Mistake[]) => void
}) {
  const [page, setPage] = useState(0)
  const { games, failures } = outcome

  return (
    <div className="min-w-0 space-y-3">
      {failures.map(({ source, error }) => (
        <p key={source} className="text-sm text-loss">
          {sourceErrorMessage(source, error)}
        </p>
      ))}
      {games.length === 0 ? (
        <p className="text-muted-foreground">{m.review_no_games()}</p>
      ) : (
        <>
          <ThemeBars mistakes={games.flatMap((game) => game.mistakes)} />
          <GamesTable
            games={pageSlice(games, page, RESULTS_PAGE_SIZE)}
            extra={{
              header: m.review_col_errors(),
              cell: (game: ReviewedGame) => (
                <span className="inline-flex items-center justify-end gap-2">
                  <span
                    className={cn(
                      'num text-base font-medium',
                      game.mistakes.length === 0 ? 'text-win' : 'text-loss',
                    )}
                  >
                    {formatNumber(game.mistakes.length)}
                  </span>
                  <Button
                    size="xs"
                    disabled={game.mistakes.length === 0}
                    onClick={() => onTrain(game.mistakes)}
                    title={m.replay_game()}
                  >
                    <Swords data-icon="inline-start" />
                    <span className="max-sm:sr-only">{m.replay_game_short()}</span>
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
          <TrainingPrompt outcome={outcome} />
          <FeedbackNudge text={m.feedback_nudge_results()} />
        </>
      )}
    </div>
  )
}
