import { ENDGAME_MAX_PIECES } from './themes'

/**
 * Where a game leaves the opening and enters the endgame, as Lichess draws it on its chart
 * (scalachess Divider, without its "mixedness" criterion). Middlegame: 10 pieces or fewer besides
 * kings and pawns, or a back rank with fewer than 4 of its own pieces (development). Endgame: 6 or
 * fewer, as the "endgame" theme.
 */

export type GamePhases = {
  /** Index of the first middlegame position, if the game gets there before the endgame */
  middlegame?: number
  /** Index of the first endgame position, if any */
  endgame?: number
}

const MIDDLEGAME_MAX_PIECES = 10
const SPARSE_BACK_RANK = 4

/** Rows of the board, from the 8th rank down, as FEN digits expanded to dots. */
function ranks(fen: string): string[] {
  return fen
    .split(' ')[0]!
    .split('/')
    .map((rank) => rank.replace(/\d/g, (digits) => '.'.repeat(Number(digits))))
}

function majorsAndMinors(rows: string[]): number {
  return rows.join('').replace(/[^nbrqNBRQ]/g, '').length
}

function backRankSparse(rows: string[]): boolean {
  const white = (rows[7] ?? '').replace(/[^A-Z]/g, '').length
  const black = (rows[0] ?? '').replace(/[^a-z]/g, '').length
  return white < SPARSE_BACK_RANK || black < SPARSE_BACK_RANK
}

export function gamePhases(positions: { fen: string }[]): GamePhases {
  let middlegame: number | undefined
  let endgame: number | undefined
  positions.forEach(({ fen }, index) => {
    const rows = ranks(fen)
    const pieces = majorsAndMinors(rows)
    if (endgame === undefined && pieces <= ENDGAME_MAX_PIECES) endgame = index
    if (middlegame === undefined && (pieces <= MIDDLEGAME_MAX_PIECES || backRankSparse(rows))) {
      middlegame = index
    }
  })
  // Straight from the opening into the endgame: no middlegame.
  if (middlegame !== undefined && endgame !== undefined && middlegame >= endgame) {
    middlegame = undefined
  }
  return { middlegame, endgame }
}
