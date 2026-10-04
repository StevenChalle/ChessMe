import { Chess, type Color } from 'chessops'
import { makeFen, parseFen } from 'chessops/fen'
import { parseSan } from 'chessops/san'
import { MATE_CP } from './errors'

export type GamePosition = {
  fen: string
  turn: Color
  /**
   * Exact evaluation (White's side, centipawns) when the game is over in this position:
   * checkmate, stalemate or insufficient material. No engine needed.
   */
  finalCp?: number
}

/**
 * Replays SAN moves and returns every position: the starting one, then one after each move.
 * Stops at the first move that does not parse, keeping the positions reached so far.
 */
export function replay(sanMoves: string[], initialFen?: string): GamePosition[] {
  const position = initialFen
    ? Chess.fromSetup(parseFen(initialFen).unwrap()).unwrap()
    : Chess.default()
  const positions = [describe(position)]
  for (const san of sanMoves) {
    const move = parseSan(position, san)
    if (!move) break
    position.play(move)
    positions.push(describe(position))
  }
  return positions
}

function describe(position: Chess): GamePosition {
  return { fen: makeFen(position.toSetup()), turn: position.turn, finalCp: finalCp(position) }
}

function finalCp(position: Chess): number | undefined {
  // The side to move is mated: the other side wins.
  if (position.isCheckmate()) return position.turn === 'white' ? -MATE_CP : MATE_CP
  if (position.isStalemate() || position.isInsufficientMaterial()) return 0
  return undefined
}
