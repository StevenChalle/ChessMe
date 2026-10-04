import { describe, expect, it } from 'vitest'
import { MATE_CP } from './errors'
import { replay } from './positions'

describe('replay', () => {
  it('returns the starting position then one per move', () => {
    const positions = replay(['e4', 'e5', 'Nf3'])
    expect(positions).toHaveLength(4)
    expect(positions[0]).toEqual({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'white',
      finalCp: undefined,
    })
    expect(positions[3]!.turn).toBe('black')
    expect(positions[3]!.fen).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')
  })

  it('scores checkmate exactly', () => {
    const positions = replay(['f3', 'e5', 'g4', 'Qh4#'])
    expect(positions.at(-1)!.finalCp).toBe(-MATE_CP)
  })

  it('scores stalemate as a draw', () => {
    const positions = replay(['Qb6'], 'k7/8/8/8/8/8/1Q6/K7 w - - 0 1')
    expect(positions.at(-1)!.finalCp).toBe(0)
  })

  it('stops at an unreadable move', () => {
    expect(replay(['e4', 'Ke3', 'e5'])).toHaveLength(2)
  })
})
