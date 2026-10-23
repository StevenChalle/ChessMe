import { describe, expect, it } from 'vitest'
import { gamePhases } from './phases'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// Knights, bishops and queens out: three pieces left on each back rank (kings count)
const DEVELOPED = 'r3k2r/ppppqppp/2n2n2/2b2b2/2B2B2/2N2N2/PPPPQPPP/R3K2R w KQkq - 0 1'
const ROOK_ENDGAME = '4k3/pppr1ppp/8/8/8/8/PPP2PPP/3RK3 w - - 0 1'

describe('gamePhases', () => {
  it('finds no phase while the pieces are home', () => {
    expect(gamePhases([{ fen: START }, { fen: START }])).toEqual({})
  })

  it('starts the middlegame once a back rank is cleared', () => {
    expect(gamePhases([{ fen: START }, { fen: DEVELOPED }, { fen: DEVELOPED }])).toEqual({
      middlegame: 1,
      endgame: undefined,
    })
  })

  it('starts the endgame with 6 pieces or fewer', () => {
    expect(gamePhases([{ fen: START }, { fen: DEVELOPED }, { fen: ROOK_ENDGAME }])).toMatchObject({
      middlegame: 1,
      endgame: 2,
    })
  })

  it('has no middlegame when the endgame comes first', () => {
    expect(gamePhases([{ fen: START }, { fen: ROOK_ENDGAME }])).toEqual({
      middlegame: undefined,
      endgame: 1,
    })
  })
})
