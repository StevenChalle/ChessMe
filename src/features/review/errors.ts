import type { Color } from 'chessops'
import type { EngineScore } from '@/lib/engine/uci'

/**
 * What counts as an error ("mistake"). See docs/decisions.md, "Notion d'erreur".
 *
 * For each move of the reviewed player, compare the evaluation before and after it, both from
 * that player's side, in centipawns:
 *   loss = before − after
 *   error ⇔ loss ≥ 100 cp, unless the game stays decided: before and after both ≥ +400 cp
 *           (still winning) or both ≤ −400 cp (already lost).
 * Mates count as ±10 000 cp, so missing a mate or walking into one is an error unless the game
 * stays decided on the same side.
 */

/** Minimum evaluation drop for a move to be an error: one pawn. */
export const ERROR_MIN_LOSS_CP = 100

/** Beyond ±4 pawns, a game is decided: drops that stay on the same side do not count. */
export const DECIDED_CP = 400

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

/** The rule above, on evaluations from the moving player's side. */
export function isError(beforeCp: number, afterCp: number): boolean {
  if (beforeCp - afterCp < ERROR_MIN_LOSS_CP) return false
  const stillWinning = beforeCp >= DECIDED_CP && afterCp >= DECIDED_CP
  const alreadyLost = beforeCp <= -DECIDED_CP && afterCp <= -DECIDED_CP
  return !stillWinning && !alreadyLost
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

export function countErrors(whiteCps: number[], turns: Color[], color: Color): number {
  return playerMoves(whiteCps, turns, color).filter((move) => isError(move.beforeCp, move.afterCp))
    .length
}
