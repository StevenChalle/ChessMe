import { ArrowLeft, Swords, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GamesTable } from '@/features/games/components/GamesTable'
import { sourceErrorMessage } from '@/features/player/sources'
import { TrainingView } from '@/features/training/components/TrainingView'
import { useKeepAwake } from '@/hooks/useKeepAwake'
import { formatClock, formatNumber } from '@/lib/format'
import { pageSlice } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import type { Mistake, ReviewedGame, ReviewOutcome } from '../analyze'
import { DEFAULT_CRITERIA } from '../criteria'
import type { ReviewAccount } from '../fetch'
import { defaultSelection } from '../selection'
import { loadReviewSettings, saveReviewSettings } from '../settings'
import { useGameReview, type ReviewState } from '../useGameReview'
import { ReviewRecap } from './ReviewRecap'
import { ReviewSetup, type GameCounts } from './ReviewSetup'
import { ReviewSteps } from './ReviewSteps'

/** quick: the last game, default rules, straight away. advanced: filters, recap, then analysis. */
export type ReviewMode = 'quick' | 'advanced'

const RESULTS_PAGE_SIZE = 20

export function ReviewDialog({
  accounts,
  gameCounts,
  mode,
  open,
  onOpenChange,
}: {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
  mode: ReviewMode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Nothing is saved yet: closing during a search or an analysis loses it, so ask first.
  const busy = useRef(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy.current && !window.confirm(m.review_confirm_close())) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === 'quick' ? m.review_title_last() : m.review_title()}</DialogTitle>
          <DialogDescription>
            {mode === 'quick' ? m.review_description() : m.review_setup_description()}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: closing the dialog aborts the review. */}
        <ReviewSession
          accounts={accounts}
          gameCounts={gameCounts}
          mode={mode}
          onBusyChange={(value) => {
            busy.current = value
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Errors to replay: all of them, or those of a single game. */
type Training = { mistakes: Mistake[] }

function ReviewSession({
  accounts,
  gameCounts,
  mode,
  onBusyChange,
}: {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
  mode: ReviewMode
  onBusyChange: (busy: boolean) => void
}) {
  const sources = accounts.map((account) => account.source)
  const { state, find, analyze, backToSetup } = useGameReview(
    mode === 'quick' ? { status: 'running', progress: { phase: 'fetching' } } : { status: 'setup' },
  )
  const [settings, setSettings] = useState(() => loadReviewSettings(sources))
  const [training, setTraining] = useState<Training | undefined>()

  // The quick review starts right away: the last game, default rules.
  useEffect(() => {
    if (mode !== 'quick') return
    const selection = { ...defaultSelection(sources), scope: { kind: 'latest' as const, count: 1 } }
    void find(accounts, selection, DEFAULT_CRITERIA, { thenAnalyze: true })
    // Once per opening (the dialog remounts this component).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busy = state.status === 'finding' || state.status === 'running'
  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])
  useKeepAwake(state.status === 'running')

  const inTraining = training !== undefined && state.status === 'done'
  const started = state.status === 'running' || state.status === 'done'

  return (
    <div className="min-w-0 space-y-2">
      {inTraining ? (
        <TrainingView
          mistakes={training.mistakes}
          validMaxDrop={state.outcome.criteria.validMaxDrop}
          onExit={() => setTraining(undefined)}
        />
      ) : state.status === 'setup' || state.status === 'finding' ? (
        <ReviewSetup
          accounts={accounts}
          gameCounts={gameCounts}
          initial={settings}
          finding={state.status === 'finding'}
          onFind={(next) => {
            setSettings(next)
            saveReviewSettings(next)
            void find(accounts, next.selection, next.criteria)
          }}
        />
      ) : state.status === 'found' ? (
        <ReviewRecap
          found={state.found}
          criteria={state.criteria}
          onEdit={backToSetup}
          onLaunch={() => void analyze(state.found, state.criteria)}
        />
      ) : (
        <ReviewProgressOrResults
          state={state}
          single={mode === 'quick'}
          onTrain={(mistakes) => setTraining({ mistakes })}
          onEdit={mode === 'advanced' ? backToSetup : undefined}
        />
      )}
      {/* Kept mounted (hidden) during training so the review time survives a round trip. */}
      {started && <Stopwatch running={state.status === 'running'} hidden={inTraining} />}
    </div>
  )
}

/** Discreet total time since the analysis started, frozen once it ends. */
function Stopwatch({ running, hidden }: { running: boolean; hidden: boolean }) {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(timer)
      setNow(Date.now())
    }
  }, [running])

  return (
    <p
      hidden={hidden}
      className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
      title={m.review_elapsed()}
    >
      <Timer aria-hidden className="size-3" />
      <span className="sr-only">{m.review_elapsed()}</span>
      {formatClock((now - startedAt) / 1000)}
    </p>
  )
}

function ReviewProgressOrResults({
  state,
  single,
  onTrain,
  onEdit,
}: {
  state: Extract<ReviewState, { status: 'running' | 'done' | 'error' }>
  single: boolean
  onTrain: (mistakes: Mistake[]) => void
  onEdit?: () => void
}) {
  if (state.status === 'running') return <ReviewSteps progress={state.progress} single={single} />
  if (state.status === 'error') return <p className="text-bad">{m.review_failed()}</p>
  return <ReviewResults outcome={state.outcome} onTrain={onTrain} onEdit={onEdit} />
}

function ReviewResults({
  outcome: { games, failures, criteria },
  onTrain,
  onEdit,
}: {
  outcome: ReviewOutcome
  onTrain: (mistakes: Mistake[]) => void
  onEdit?: () => void
}) {
  const [page, setPage] = useState(0)
  const mistakes = useMemo(() => games.flatMap((game) => game.mistakes), [games])

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button size="lg" disabled={mistakes.length === 0} onClick={() => onTrain(mistakes)}>
              <Swords data-icon="inline-start" />
              {m.training_start({ count: formatNumber(mistakes.length) })}
            </Button>
            <span className="text-xs text-muted-foreground">
              {m.results_criteria({
                error: String(criteria.errorMinDrop),
                valid: String(criteria.validMaxDrop),
              })}
            </span>
          </div>
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
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-muted-foreground">
          <ArrowLeft data-icon="inline-start" />
          {m.recap_edit()}
        </Button>
      )}
    </div>
  )
}
