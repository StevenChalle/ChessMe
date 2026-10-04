import type { Color } from 'chessops'
import { ArrowRight, Check, Lightbulb, LoaderCircle, RotateCcw, Shuffle, X } from 'lucide-react'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ExternalLink } from '@/features/player/components/ExternalLink'
import type { Mistake } from '@/features/review/analyze'
import { SideSquare } from '@/features/games/components/GamesTable'
import { forColor, isValidMove } from '@/features/review/errors'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { evalDelta, formatDelta, formatEval } from '../evaluation'
import { REFERENCE_LINES } from '../coach'
import { lichessAnalysisUrl, play, sameMove, sanOf } from '../moves'
import type { TrainingAction, TrainingState } from '../session'

type Tone = 'good' | 'bad' | 'solution'

const TONES: Record<Tone, { box: string; icon: string; title: string }> = {
  good: { box: 'bg-good/12 ring-good/40', icon: 'bg-good', title: 'text-good' },
  bad: { box: 'bg-bad/10 ring-bad/35', icon: 'bg-bad', title: 'text-bad' },
  solution: { box: 'bg-primary/10 ring-primary/35', icon: 'bg-primary', title: 'text-primary' },
}

const APPEAR =
  'animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none'

/** The outcome of a try: a tinted block with an icon, a short title and the moves. */
function Feedback({
  tone,
  icon,
  title,
  children,
}: {
  tone: Tone
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  const style = TONES[tone]
  return (
    <div className={cn('space-y-3 rounded-md p-4 ring-1', style.box, APPEAR)}>
      <p className={cn('flex items-center gap-3 text-xl font-semibold', style.title)}>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground [&_svg]:size-5',
            style.icon,
            'animate-in duration-300 ease-out zoom-in-50 motion-reduce:animate-none',
          )}
        >
          {icon}
        </span>
        {title}
      </p>
      {children}
    </div>
  )
}

/** An evaluation, as a small chip. The target of a transition stands out, its origin less. */
function EvalChip({ cp, color, muted }: { cp: number; color: Color; muted?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 py-0.5 text-sm tabular-nums',
        muted
          ? 'bg-background/35 text-muted-foreground'
          : 'bg-background/70 font-medium text-font-clear',
      )}
    >
      {formatEval(forColor(cp, color))}
    </span>
  )
}

/**
 * A move and what it does to the position, under a small title:
 *   Your move
 *   Rb1                  +4.1 → −5.2 (−9.4)
 * the position's evaluation, the evaluation after the move and the change.
 */
function MoveLine({
  label,
  san,
  color,
  cp,
  baseCp,
  showDelta = true,
}: {
  label: string
  san: string
  /** The player's color: evaluations are shown from White's side, as usual in chess */
  color: Color
  /** From the player's side */
  cp?: number
  baseCp?: number
  showDelta?: boolean
}) {
  const delta =
    showDelta && cp !== undefined && baseCp !== undefined
      ? evalDelta(forColor(baseCp, color), forColor(cp, color))
      : undefined
  return (
    <div className="space-y-0.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-font-clear">{san}</span>
        {cp !== undefined && (
          <span className="ml-auto flex items-center gap-1.5">
            {baseCp !== undefined && (
              <>
                <EvalChip cp={baseCp} color={color} muted />
                <ArrowRight aria-hidden className="size-3.5 text-muted-foreground" />
              </>
            )}
            <EvalChip cp={cp} color={color} />
            {delta !== undefined && (
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  isValidMove(baseCp!, cp) ? 'text-good' : 'text-bad',
                )}
                title={m.training_delta_title({ eval: formatEval(forColor(baseCp!, color)) })}
              >
                ({formatDelta(delta)})
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/** Going further: the position on Lichess's analysis board, and the game itself. */
function DeeperLinks({ puzzle }: { puzzle: Mistake }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm">
      <ExternalLink href={lichessAnalysisUrl(puzzle.fen, puzzle.color)}>
        {m.training_analyse_lichess()}
      </ExternalLink>
      <ExternalLink href={puzzle.game.url}>{m.training_view_game()}</ExternalLink>
    </p>
  )
}

/**
 * "3 valid moves", the list on hover (mouse) or tap (touch): the moves accepted in this position,
 * among the engine's top lines plus any the player found beyond them.
 */
function ValidMoves({ state, puzzle }: { state: TrainingState; puzzle: Mistake }) {
  const [open, setOpen] = useState(false)
  const { validMoves, validCapped, best, tried } = state
  if (!validMoves || validMoves.length === 0) return null
  const count = validMoves.length
  const label = validCapped
    ? m.training_valid_moves_more({ formatted: formatNumber(count) })
    : m.training_valid_moves({ count, formatted: formatNumber(count) })
  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="text-sm text-foreground underline decoration-dotted underline-offset-4 hover:text-font-clear"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
      >
        <p className="text-xs text-muted-foreground">{m.training_valid_moves_title()}</p>
        <ul className="space-y-1">
          {validMoves.map((move) => {
            const isBest = best !== undefined && sameMove(puzzle.fen, move.uci, best)
            const isTried = tried !== undefined && sameMove(puzzle.fen, move.uci, tried)
            return (
              <li key={move.uci} className="flex items-center justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className={cn('font-semibold text-font-clear', isTried && 'text-good')}>
                    {sanOf(puzzle.fen, move.uci)}
                  </span>
                  {isBest && (
                    <span className="text-xs text-muted-foreground">{m.training_best_tag()}</span>
                  )}
                </span>
                <EvalChip cp={move.cp} color={puzzle.color} />
              </li>
            )
          })}
        </ul>
        {validCapped && (
          <p className="text-xs text-muted-foreground">
            {m.training_valid_moves_more_hint({ count: formatNumber(REFERENCE_LINES) })}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Side to move and the task, large: the first thing to read. */
function Prompt({
  puzzle,
  exploring,
  positionCp,
}: {
  puzzle: Mistake
  exploring: boolean
  /** Shown once a first try has revealed it: never a hint before that. */
  positionCp?: number
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-3 text-2xl font-semibold text-font-clear">
        <SideSquare color={puzzle.color} className="size-5" />
        {puzzle.color === 'white' ? m.training_white_to_play() : m.training_black_to_play()}
      </p>
      <p className="text-base text-muted-foreground">
        {exploring ? m.training_explore_hint() : m.training_find_move()}
      </p>
      {positionCp !== undefined && (
        <p className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
          {m.training_position_eval()}
          <EvalChip cp={positionCp} color={puzzle.color} />
        </p>
      )}
    </div>
  )
}

export function PuzzlePanel({
  state,
  puzzle,
  dispatch,
}: {
  state: TrainingState
  puzzle: Mistake
  dispatch: (action: TrainingAction) => void
}) {
  const { status, tried, triedCp, best, bestCp } = state
  const last = state.index === state.puzzles.length - 1
  // Already solved or revealed: the player is trying other moves and may move on at any time.
  const exploring = state.outcome !== undefined
  // The position's evaluation stays visible once the first verdict has shown it.
  const positionCp =
    state.attempts > 1 || (state.attempts === 1 && status !== 'checking') ? bestCp : undefined
  const next = (
    <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
      {last ? m.training_see_summary() : m.training_next()}
      <ArrowRight data-icon="inline-end" />
    </Button>
  )

  if (status === 'thinking' || status === 'checking') {
    return (
      <div className="space-y-4">
        <Prompt puzzle={puzzle} exploring={exploring} positionCp={positionCp} />
        {status === 'checking' && (
          <p className="flex items-center gap-2 text-lg text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            {m.training_checking()}
          </p>
        )}
        {exploring && next}
      </div>
    )
  }

  const foundBest = Boolean(tried && best && sameMove(puzzle.fen, tried, best))
  const yourMove = tried && (
    <MoveLine
      color={puzzle.color}
      label={m.training_your_move()}
      san={sanOf(puzzle.fen, tried)}
      cp={triedCp}
      baseCp={bestCp}
      // Found the engine's move: a "(0.0)" change would only add noise.
      showDelta={!foundBest}
    />
  )
  const bestMove = best && (
    <MoveLine
      color={puzzle.color}
      label={m.training_best_move()}
      san={sanOf(puzzle.fen, best)}
      cp={bestCp}
      baseCp={bestCp}
      showDelta={false}
    />
  )

  if (status === 'wrong') {
    return (
      <div className="space-y-4">
        <Feedback tone="bad" icon={<X />} title={m.training_wrong_title()}>
          {yourMove}
          <p className="text-sm text-foreground">
            {tried && sameMove(puzzle.fen, tried, puzzle.played.uci)
              ? m.training_wrong_game_move()
              : m.training_wrong_hint()}
          </p>
          {tried && state.triedReply && (
            <p className="flex items-center gap-2 text-base text-font-clear">
              <span className="text-sm text-muted-foreground">{m.training_engine_reply()}</span>
              <span className="text-xl font-semibold text-bad">
                {sanOf(play(puzzle.fen, tried).fen, state.triedReply)}
              </span>
            </p>
          )}
        </Feedback>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            // While exploring, moving on is the main action.
            variant={exploring ? 'outline' : 'default'}
            onClick={() => dispatch({ type: 'retry' })}
          >
            <RotateCcw data-icon="inline-start" />
            {m.training_retry()}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!best}
            onClick={() => dispatch({ type: 'reveal' })}
          >
            <Lightbulb data-icon="inline-start" />
            {m.training_show_solution()}
          </Button>
        </div>
        {exploring && next}
        <DeeperLinks puzzle={puzzle} />
      </div>
    )
  }
  if (status !== 'solved' && status !== 'revealed') return null

  return (
    <div className="space-y-4">
      {status === 'solved' ? (
        <Feedback tone="good" icon={<Check />} title={m.training_solved_title()}>
          {yourMove}
          {foundBest ? (
            <p className="text-sm text-foreground">{m.training_solved_best()}</p>
          ) : (
            bestMove
          )}
          <ValidMoves state={state} puzzle={puzzle} />
        </Feedback>
      ) : (
        <Feedback tone="solution" icon={<Lightbulb />} title={m.training_revealed_title()}>
          {bestMove}
          <ValidMoves state={state} puzzle={puzzle} />
        </Feedback>
      )}
      <div className={cn('space-y-3', APPEAR)}>
        <div className="px-1">
          <MoveLine
            color={puzzle.color}
            label={m.training_game_move()}
            san={puzzle.played.san}
            cp={puzzle.afterCp}
            baseCp={bestCp}
          />
        </div>
        <DeeperLinks puzzle={puzzle} />
      </div>
      <div className="space-y-2">
        {next}
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => dispatch({ type: 'explore' })}
        >
          <Shuffle data-icon="inline-start" />
          {m.training_explore()}
        </Button>
      </div>
    </div>
  )
}
