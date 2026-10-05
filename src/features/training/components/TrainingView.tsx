import type { Config } from '@lichess-org/chessground/config'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Board } from '@/components/board/Board'
import type { Mistake } from '@/features/review/analyze'
import { VALID_MAX_DROP } from '@/features/review/errors'
import { Progress } from '@/components/ui/progress'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { Coach, validMovesOf } from '../coach'
import { ValidMaxDropContext } from '../criteria'
import {
  boardMoveToUci,
  isCheck,
  legalDests,
  moveSquares,
  play,
  positionFromFen,
  sameMove,
} from '../moves'
import { currentPuzzle, startTraining, trainingReducer, type TrainingState } from '../session'
import { PuzzlePanel } from './PuzzlePanel'
import { TrainingSummary } from './TrainingSummary'
import { SIDE_BY_SIDE, useBoardSize } from '../useBoardSize'

const squares = (uci: string) => moveSquares(uci) as [Key, Key]
const arrow = (uci: string, brush: string): DrawShape => {
  const [orig, dest] = squares(uci)
  return { orig, dest, brush }
}

/**
 * What the board shows. Before the position is solved, the player's tried move stays on the
 * board, with the engine's reply in red after a miss. Once solved with another move than the
 * best, or once the solution is shown, the board goes back to the position with arrows: best move
 * (green), the game's move (red), theirs (blue).
 */
function boardView(state: TrainingState, puzzle: Mistake) {
  const { status, tried, best } = state
  const triedIsBest = Boolean(tried && best && sameMove(puzzle.fen, tried, best))
  const showsTried =
    tried !== undefined &&
    (status === 'checking' || status === 'wrong' || (status === 'solved' && (triedIsBest || !best)))
  if (showsTried) {
    // A miss shows how it gets punished: the engine's reply, in red.
    const punishment = status === 'wrong' && state.triedReply
    return {
      fen: play(puzzle.fen, tried).fen,
      lastMove: tried,
      shapes: punishment ? [arrow(punishment, 'red')] : [],
    }
  }

  const shapes: DrawShape[] = []
  if (status === 'solved' || status === 'revealed') {
    shapes.push(arrow(puzzle.played.uci, 'red'))
    if (tried) shapes.push(arrow(tried, 'blue'))
    if (best) shapes.push(arrow(best, 'green'))
  }
  return { fen: puzzle.fen, lastMove: puzzle.lastMove, shapes }
}

function bringBoard(board: HTMLElement | null) {
  if (window.matchMedia(SIDE_BY_SIDE).matches) window.scrollTo({ top: 0, behavior: 'smooth' })
  else board?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

/**
 * Replays the player's errors one by one, in random order, then shows a summary.
 * `validMaxDrop`: the valid-move threshold of the review (see isValidMove).
 */
export function TrainingView({
  mistakes,
  validMaxDrop = VALID_MAX_DROP,
  active = true,
  onExit,
}: {
  mistakes: Mistake[]
  validMaxDrop?: number
  /** The training is on screen (its tab is shown) */
  active?: boolean
  onExit: () => void
}) {
  const [state, dispatch] = useReducer(trainingReducer, mistakes, (all) => startTraining(all))
  const [engineFailed, setEngineFailed] = useState(false)
  const [coach] = useState(() => new Coach(validMaxDrop))
  const layoutRef = useRef<HTMLDivElement>(null)
  const boardSize = useBoardSize(layoutRef)
  const boardRef = useRef<HTMLDivElement>(null)
  const puzzle = currentPuzzle(state)

  // The board back on screen in full: on a phone, at the top of the screen, the feedback right
  // below it; on a computer, the page scrolled to the top, which the board's size is computed for.
  // Arriving on the tab (or a new training), whatever the puzzle's state. The navigations to it
  // keep the scroll position (`resetScroll: false`), so the router does not undo this.
  useEffect(() => {
    if (active) bringBoard(boardRef.current)
  }, [active])
  // On the tab, whenever the board waits for a move again: next mistake, retry, explore. Not after
  // a move: the feedback shows right below the board.
  useEffect(() => {
    if (active && state.status === 'thinking') bringBoard(boardRef.current)
  }, [active, state.index, state.status])

  // One engine for the whole training, stopped when leaving it (or closing the dialog).
  useEffect(() => {
    coach.activate()
    return () => coach.terminate()
  }, [coach])

  // Look for the best move while the player thinks.
  useEffect(() => {
    if (!puzzle) return
    let active = true
    coach.reference(puzzle).then(
      (reference) => {
        const valid = validMovesOf(reference, puzzle, validMaxDrop)
        dispatch({
          type: 'best',
          puzzleId: puzzle.id,
          uci: reference.bestMove,
          cp: reference.bestCp,
          validMoves: valid.moves,
          validCapped: valid.capped,
        })
      },
      (error: unknown) => {
        if (!active) return
        console.error('Training: reference search failed', error)
        setEngineFailed(true)
      },
    )
    return () => {
      active = false
    }
  }, [coach, puzzle, validMaxDrop])

  const config = useMemo((): Config | undefined => {
    if (!puzzle) return undefined
    const { fen, lastMove, shapes } = boardView(state, puzzle)
    const thinking = state.status === 'thinking'
    const turn = positionFromFen(fen).turn
    return {
      fen,
      orientation: puzzle.color,
      turnColor: turn,
      check: isCheck(fen) ? turn : false,
      lastMove: lastMove ? squares(lastMove) : undefined,
      movable: {
        free: false,
        color: thinking ? puzzle.color : undefined,
        dests: thinking ? legalDests(fen) : new Map(),
        events: {
          after: (orig, dest) => {
            const uci = boardMoveToUci(puzzle.fen, orig, dest)
            dispatch({ type: 'try', uci })
            coach.check(puzzle, uci).then(
              ({ valid, afterCp, reply }) =>
                dispatch({ type: 'verdict', puzzleId: puzzle.id, valid, afterCp, reply }),
              (error: unknown) => {
                console.error('Training: move check failed', error)
                setEngineFailed(true)
              },
            )
          },
        },
      },
      premovable: { enabled: false },
      drawable: { autoShapes: shapes },
    }
  }, [coach, state, puzzle])

  if (!puzzle || !config) {
    return <TrainingSummary results={state.results} onFinish={onExit} />
  }

  const remaining = state.puzzles.length - state.index
  return (
    // On a computer, as large as the window and the page's column allow (see useBoardSize), the
    // panel centered vertically next to it. On a phone, at least a screen high, so that the page
    // can always scroll the board up to the top of the screen.
    <div
      ref={layoutRef}
      className="flex min-h-dvh flex-col gap-6 md:min-h-0 md:flex-row md:items-center md:justify-center"
    >
      <div
        ref={boardRef}
        className="mx-auto w-full max-w-[32rem] scroll-mt-2 md:mx-0 md:max-w-none"
        style={{ width: boardSize }}
      >
        <Board config={config} className="rounded-sm" />
      </div>
      <div className="flex flex-col gap-5 md:w-80 md:shrink-0">
        <div className="space-y-2">
          <p className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-medium text-font-clear">
              {m.training_progress({
                current: formatNumber(state.index + 1),
                total: formatNumber(state.puzzles.length),
              })}
            </span>
            <span className="text-sm text-muted-foreground">
              {m.training_remaining({ count: remaining, formatted: formatNumber(remaining) })}
            </span>
          </p>
          <Progress value={(state.index / state.puzzles.length) * 100} />
        </div>
        {engineFailed ? (
          <p className="text-bad">{m.training_engine_failed()}</p>
        ) : (
          <ValidMaxDropContext value={validMaxDrop}>
            <PuzzlePanel state={state} puzzle={puzzle} dispatch={dispatch} />
          </ValidMaxDropContext>
        )}
      </div>
    </div>
  )
}
