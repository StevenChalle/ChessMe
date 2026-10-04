import { describe, expect, it } from 'vitest'
import {
  countErrors,
  fromSideToMove,
  isError,
  isValidMove,
  MATE_CP,
  playerMoves,
  toCp,
  winChance,
} from './errors'

describe('winChance', () => {
  it('follows the Lichess curve', () => {
    expect(winChance(0)).toBe(50)
    expect(winChance(100)).toBeCloseTo(59.1, 1)
    expect(winChance(-100)).toBeCloseTo(40.9, 1)
    expect(winChance(MATE_CP)).toBeCloseTo(100, 5)
  })
})

describe('isError (≥ 10 % of winning chances lost)', () => {
  it.each([
    // [before, after, expected, why]
    [0, -100, false, 'a pawn from equality: just under 10 %'],
    [0, -120, true, 'over a pawn from equality'],
    [600, 450, false, 'still clearly winning'],
    [400, 200, true, 'from winning to unclear'],
    [MATE_CP, 900, false, 'misses a mate but stays crushing'],
    [MATE_CP, 300, true, 'misses a mate'],
    [-500, -800, false, 'already lost'],
    [100, -MATE_CP, true, 'walks into a mate'],
    [-100, 300, false, 'improves'],
  ])('%i → %i: %s (%s)', (before, after, expected) => {
    expect(isError(before, after)).toBe(expected)
  })
})

describe('scores', () => {
  it('converts the side to move to White', () => {
    expect(fromSideToMove({ cp: 30 }, 'black')).toEqual({ cp: -30 })
    expect(fromSideToMove({ mate: 2 }, 'black')).toEqual({ mate: -2 })
    expect(fromSideToMove({ cp: 30 }, 'white')).toEqual({ cp: 30 })
  })

  it('turns mates into large centipawn values', () => {
    expect(toCp({ mate: 3 })).toBe(MATE_CP)
    expect(toCp({ mate: -1 })).toBe(-MATE_CP)
    expect(toCp({ cp: -42 })).toBe(-42)
  })
})

describe('playerMoves and countErrors', () => {
  // White blunders on ply 2 (+0.3 → −2), Black blunders back on ply 3 (−2 → +1).
  const cps = [20, 30, 30, -200, 100]
  const turns = ['white', 'black', 'white', 'black', 'white'] as const

  it('keeps only the player moves, from their side', () => {
    expect(playerMoves(cps, [...turns], 'black')).toEqual([
      { ply: 1, beforeCp: -30, afterCp: -30 },
      { ply: 3, beforeCp: 200, afterCp: -100 },
    ])
  })

  it('counts each side errors separately', () => {
    expect(countErrors(cps, [...turns], 'white')).toBe(1)
    expect(countErrors(cps, [...turns], 'black')).toBe(1)
  })
})

describe('isValidMove (< 5 % of winning chances lost vs the best move)', () => {
  it.each([
    // [best, after, expected, why]
    [0, -40, true, 'loses less than half a pawn from equality'],
    [0, -60, false, 'loses more than half a pawn from equality'],
    [80, 120, true, 'better than the engine thought'],
    [400, 330, true, 'small concession in a winning position'],
    [400, 300, false, 'gives away a pawn in a winning position'],
    [600, 450, false, 'gives away a pawn and a half'],
    [1000, 750, true, 'stays crushing'],
    [MATE_CP, 1000, true, 'misses a mate, still crushing'],
    [MATE_CP, 500, false, 'misses a mate, only winning'],
    [-300, -360, true, 'small concession when losing'],
  ])('%i → %i: %s (%s)', (best, after, expected) => {
    expect(isValidMove(best, after)).toBe(expected)
  })
})
