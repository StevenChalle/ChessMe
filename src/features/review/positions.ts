import { Chess, kingCastlesTo, makeSquare, makeUci, type Color, type Move } from 'chessops'
import { castlingSide } from 'chessops/chess'
import { makeFen, parseFen } from 'chessops/fen'
import { makeSan, parseSan } from 'chessops/san'
import { MATE_CP } from './errors'

export type GamePosition = {
  fen: string
  turn: Color
  /**
   * Exact evaluation (White's side, centipawns) when the game is over in this position:
   * checkmate, stalemate or insufficient material. No engine needed.
   */
  finalCp?: number
  /** The move that led here (absent for the starting position) */
  move?: { uci: string; san: string }
}

/**
 * Replays SAN moves and returns every position: the starting one, then one after each move.
 * Stops at the first move that does not parse, keeping the positions reached so far.
 */
export function replay(sanMoves: string[], initialFen?: string): GamePosition[] {
  const position = initialFen
    ? Chess.fromSetup(parseFen(initialFen).unwrap()).unwrap()
    : Chess.default()
  const positions = [describePosition(position)]
  for (const san of sanMoves) {
    const move = parseSan(position, san)
    if (!move) break
    const played = { uci: standardUci(position, move), san: makeSan(position, move) }
    position.play(move)
    positions.push({ ...describePosition(position), move: played })
  }
  return positions
}

export function describePosition(position: Chess): GamePosition {
  return { fen: makeFen(position.toSetup()), turn: position.turn, finalCp: finalCp(position) }
}

/**
 * UCI as engines and boards expect it: castling is the king moving two squares (e1g1),
 * whereas chessops represents it as the king taking its rook (e1h1).
 */
export function standardUci(position: Chess, move: Move): string {
  const side = castlingSide(position, move)
  if (!side || !('from' in move)) return makeUci(move)
  return makeSquare(move.from) + makeSquare(kingCastlesTo(position.turn, side))
}

function finalCp(position: Chess): number | undefined {
  // The side to move is mated: the other side wins.
  if (position.isCheckmate()) return position.turn === 'white' ? -MATE_CP : MATE_CP
  if (position.isStalemate() || position.isInsufficientMaterial()) return 0
  return undefined
}
