import type { Mistake } from '@/features/review/analyze'
import type { ScoredMove } from './coach'
import { sameMove } from './moves'

/**
 * Replaying one's errors, one position at a time:
 *   thinking → (move) checking → solved | wrong
 *   wrong → (retry) thinking | (show solution) revealed
 *   solved | revealed → (next) next position, or the summary after the last one
 *   solved | revealed → (explore) thinking: try another move to see what it gives.
 * The position's result is settled by the first solve or reveal; exploring never changes it.
 */
export type PuzzleStatus = 'thinking' | 'checking' | 'wrong' | 'solved' | 'revealed'

export type PuzzleResult = 'first-try' | 'after-retries' | 'revealed'

export type TrainingState = {
  /** Shuffled */
  puzzles: Mistake[]
  index: number
  status: PuzzleStatus | 'summary'
  /** Moves tried on the current position */
  attempts: number
  /** The last move tried (UCI), shown on the board until the next retry */
  tried?: string
  /** Evaluation after the tried move (centipawns, player's side), once checked */
  triedCp?: number
  /** Engine's best move for the current position (UCI) and its evaluation, once known */
  best?: string
  bestCp?: number
  /** Valid moves known so far, best first: the engine's top lines, plus any found beyond them */
  validMoves?: ScoredMove[]
  /** Every top line was valid: there may be more valid moves than listed */
  validCapped?: boolean
  /** Result of the current position, once solved or revealed */
  outcome?: PuzzleResult
  results: PuzzleResult[]
}

export type TrainingAction =
  | { type: 'try'; uci: string }
  | { type: 'verdict'; puzzleId: string; valid: boolean; afterCp: number }
  | {
      type: 'best'
      puzzleId: string
      uci: string
      cp: number
      validMoves: ScoredMove[]
      validCapped: boolean
    }
  | { type: 'retry' }
  | { type: 'reveal' }
  | { type: 'explore' }
  | { type: 'next' }

/** Fisher-Yates, with an injectable random source for tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return shuffled
}

export function startTraining(mistakes: Mistake[], random?: () => number): TrainingState {
  return {
    puzzles: shuffle(mistakes, random),
    index: 0,
    status: mistakes.length > 0 ? 'thinking' : 'summary',
    attempts: 0,
    results: [],
  }
}

export function currentPuzzle(state: TrainingState): Mistake | undefined {
  return state.status === 'summary' ? undefined : state.puzzles[state.index]
}

export function trainingReducer(state: TrainingState, action: TrainingAction): TrainingState {
  const puzzle = currentPuzzle(state)
  if (!puzzle) return state
  switch (action.type) {
    case 'try':
      if (state.status !== 'thinking') return state
      return { ...state, status: 'checking', attempts: state.attempts + 1, tried: action.uci }
    case 'verdict':
      // A late answer about a position already left is ignored.
      if (state.status !== 'checking' || action.puzzleId !== puzzle.id) return state
      return {
        ...state,
        status: action.valid ? 'solved' : 'wrong',
        triedCp: action.afterCp,
        validMoves: action.valid
          ? withMove(state.validMoves, puzzle.fen, { uci: state.tried!, cp: action.afterCp })
          : state.validMoves,
        outcome:
          state.outcome ??
          (action.valid ? (state.attempts === 1 ? 'first-try' : 'after-retries') : undefined),
      }
    case 'best':
      if (action.puzzleId !== puzzle.id) return state
      return {
        ...state,
        best: action.uci,
        bestCp: action.cp,
        validMoves: mergeMoves(action.validMoves, state.validMoves, puzzle.fen),
        validCapped: action.validCapped,
      }
    case 'retry':
      if (state.status !== 'wrong') return state
      return { ...state, status: 'thinking', tried: undefined, triedCp: undefined }
    case 'reveal':
      if (state.status !== 'wrong' || !state.best) return state
      return {
        ...state,
        status: 'revealed',
        tried: undefined,
        triedCp: undefined,
        outcome: state.outcome ?? 'revealed',
      }
    case 'explore':
      if (state.status !== 'solved' && state.status !== 'revealed') return state
      return { ...state, status: 'thinking', tried: undefined, triedCp: undefined }
    case 'next': {
      // Once settled, the player may move on from any state, even while exploring.
      if (!state.outcome) return state
      const result = state.outcome
      const index = state.index + 1
      return {
        ...state,
        index,
        status: index < state.puzzles.length ? 'thinking' : 'summary',
        attempts: 0,
        tried: undefined,
        triedCp: undefined,
        best: undefined,
        bestCp: undefined,
        validMoves: undefined,
        validCapped: undefined,
        outcome: undefined,
        results: [...state.results, result],
      }
    }
  }
}

/** Adds a move found valid, unless already listed; the list stays sorted best first. */
function withMove(moves: ScoredMove[] | undefined, fen: string, move: ScoredMove): ScoredMove[] {
  const list = moves ?? []
  if (list.some((known) => sameMove(fen, known.uci, move.uci))) return list
  return [...list, move].toSorted((a, b) => b.cp - a.cp)
}

/** The engine's valid moves, plus any the player already found beyond them. */
function mergeMoves(engine: ScoredMove[], found: ScoredMove[] | undefined, fen: string) {
  return (found ?? []).reduce((list, move) => withMove(list, fen, move), engine)
}

export function summarize(results: PuzzleResult[]): Record<PuzzleResult, number> {
  const totals: Record<PuzzleResult, number> = { 'first-try': 0, 'after-retries': 0, revealed: 0 }
  for (const result of results) totals[result]++
  return totals
}
