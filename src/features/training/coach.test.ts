import { describe, expect, it } from 'vitest'
import { REFERENCE_LINES, validMovesOf, type Reference } from './coach'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const mistake = { fen: START, played: { uci: 'g1f3', san: 'Nf3' } }

const reference = (cps: number[], moves = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3']): Reference => ({
  bestMove: moves[0]!,
  bestCp: cps[0]!,
  lines: cps.map((cp, index) => ({ uci: moves[index]!, cp })),
})

describe('validMovesOf', () => {
  it('keeps the top moves losing less than half a pawn, never the game move', () => {
    const { moves, capped } = validMovesOf(reference([40, 20, 15, -30, -60]), mistake)
    expect(moves.map((move) => move.uci)).toEqual(['e2e4', 'd2d4'])
    expect(capped).toBe(false)
  })

  it('flags that there may be more when every ranked line is valid', () => {
    const moves = ['e2e4', 'd2d4', 'c2c4', 'b1c3', 'g2g3']
    const result = validMovesOf(reference([30, 25, 20, 15, 10], moves), mistake)
    expect(result.moves).toHaveLength(REFERENCE_LINES)
    expect(result.capped).toBe(true)
  })
})
