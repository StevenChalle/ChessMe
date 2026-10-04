import type { Color } from 'chessops'
import type { EngineScore } from '@/lib/engine/uci'

/**
 * Errors and valid moves are judged in winning chances, not raw centipawns: losing half a pawn
 * matters in a balanced position, much less when the game is already decided. See
 * docs/decisions.md, "Notion d'erreur" and "Notion de coup valide".
 *
 * winChance(cp) = 50 + 50 × (2 / (1 + e^(−0.00368208 × cp)) − 1), in % (Lichess's model).
 * drop = winChance(before) − winChance(after), both from the moving player's side.
 *
 *   error ⇔ drop ≥ 10      (about 1.1 pawns from equality)
 *   valid ⇔ drop ≤ 5       (about half a pawn from equality; compared to the engine's best move)
 *
 * These are the defaults; the advanced review lets the user change both (criteria.ts).
 *
 * Mates count as ±10 000 cp, i.e. 100 % or 0 %.
 */

/** Minimum drop in winning chances (%) for a move to be an error. */
export const ERROR_MIN_DROP = 10

/** Maximum drop in winning chances (%), compared to the best move, for a move to be valid. */
export const VALID_MAX_DROP = 5

/** Slope of Lichess's centipawns to winning chances curve. */
const WIN_CHANCE_SLOPE = 0.00368208

/** Winning chances (0 to 100 %) of the side whose evaluation this is. */
export function winChance(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-WIN_CHANCE_SLOPE * cp)) - 1)
}

/** Winning chances lost by going from `fromCp` to `toCp` (negative when they grow). */
export function winChanceDrop(fromCp: number, toCp: number): number {
  return winChance(fromCp) - winChance(toCp)
}

/** Mate scores, in centipawns. */
export const MATE_CP = 10_000

/** Evaluation from White's side. `mate`: moves to mate, positive when White mates. */
export type WhiteScore = EngineScore

/** Engines score from the side to move: turn it into White's side. */
export function fromSideToMove(score: EngineScore, turn: Color): WhiteScore {
  if (turn === 'white') return score
  return 'cp' in score ? { cp: -score.cp } : { mate: -score.mate }
}

/** Centipawns from White's side; mates become ±MATE_CP. */
export function toCp(score: WhiteScore): number {
  if ('cp' in score) return score.cp
  return score.mate > 0 ? MATE_CP : -MATE_CP
}

/** Centipawns from `color`'s side. */
export function forColor(whiteCp: number, color: Color): number {
  return color === 'white' ? whiteCp : -whiteCp
}

/** Evaluations from the moving player's side, before and after the move. */
export function isError(beforeCp: number, afterCp: number, minDrop = ERROR_MIN_DROP): boolean {
  return winChanceDrop(beforeCp, afterCp) >= minDrop
}

export type PlayerMove = {
  /** Index of the position before the move; the move leads to position `ply + 1`. */
  ply: number
  /** From the player's side */
  beforeCp: number
  afterCp: number
}

/**
 * The player's moves with their evaluations before and after.
 * `whiteCps[i]` evaluates position i (White's side), `turns[i]` is the side to move there.
 */
export function playerMoves(whiteCps: number[], turns: Color[], color: Color): PlayerMove[] {
  const moves: PlayerMove[] = []
  for (let ply = 0; ply + 1 < whiteCps.length; ply++) {
    if (turns[ply] !== color) continue
    moves.push({
      ply,
      beforeCp: forColor(whiteCps[ply]!, color),
      afterCp: forColor(whiteCps[ply + 1]!, color),
    })
  }
  return moves
}

export function countErrors(
  whiteCps: number[],
  turns: Color[],
  color: Color,
  minDrop = ERROR_MIN_DROP,
): number {
  return playerMoves(whiteCps, turns, color).filter((move) =>
    isError(move.beforeCp, move.afterCp, minDrop),
  ).length
}

/** From the player's side: `bestCp` after the best move, `afterCp` after the tried one. */
export function isValidMove(bestCp: number, afterCp: number, maxDrop = VALID_MAX_DROP): boolean {
  return winChanceDrop(bestCp, afterCp) <= maxDrop
}
