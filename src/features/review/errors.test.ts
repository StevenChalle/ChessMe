import { describe, expect, it } from 'vitest'
import { countErrors, fromSideToMove, isError, MATE_CP, playerMoves, toCp } from './errors'

describe('isError', () => {
  it.each([
    // [before, after, expected, why]
    [50, -60, true, 'equal to slightly worse'],
    [30, -69, false, 'loses less than a pawn'],
    [30, -70, true, 'loses exactly a pawn'],
    [600, 450, false, 'still winning'],
    [450, 300, true, 'falls back below +4'],
    [MATE_CP, 200, true, 'misses a mate'],
    [MATE_CP, 500, false, 'misses a mate but still winning'],
    [-500, -800, false, 'already lost'],
    [-300, -500, true, 'falls into a lost position'],
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
