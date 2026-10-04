import { describe, expect, it } from 'vitest'
import { winChanceDrop, isError, isValidMove } from './errors'
import { DEFAULT_CRITERIA, deepCheckMinDrop, LICHESS_MARKERS, normalizeCriteria } from './criteria'

describe('criteria', () => {
  it('defaults to the quick review rules: error from 10, valid under 5', () => {
    expect(DEFAULT_CRITERIA).toEqual({ errorMinDrop: 10, validMaxDrop: 5 })
  })

  it('places Lichess judgements on our scale (half of their −1..1 deltas × 100)', () => {
    expect(LICHESS_MARKERS).toEqual({ inaccuracy: 5, mistake: 10, blunder: 15 })
  })

  it('keeps the deep check a margin below the error threshold', () => {
    expect(deepCheckMinDrop(DEFAULT_CRITERIA)).toBe(6)
    expect(deepCheckMinDrop({ errorMinDrop: 15, validMaxDrop: 5 })).toBe(11)
    expect(deepCheckMinDrop({ errorMinDrop: 3, validMaxDrop: 1 })).toBe(1)
  })

  it('bounds and rounds both thresholds', () => {
    expect(normalizeCriteria({ errorMinDrop: 99, validMaxDrop: 0.2 })).toEqual({
      errorMinDrop: 30,
      validMaxDrop: 1,
    })
    expect(normalizeCriteria({ errorMinDrop: 12.6, validMaxDrop: 4.4 })).toEqual({
      errorMinDrop: 13,
      validMaxDrop: 4,
    })
  })

  it('keeps a valid move strictly below an error, the other threshold giving way', () => {
    expect(normalizeCriteria({ errorMinDrop: 4, validMaxDrop: 5 }, 'errorMinDrop')).toEqual({
      errorMinDrop: 4,
      validMaxDrop: 3,
    })
    expect(normalizeCriteria({ errorMinDrop: 10, validMaxDrop: 12 }, 'validMaxDrop')).toEqual({
      errorMinDrop: 13,
      validMaxDrop: 12,
    })
  })
})

describe('custom thresholds in the rules', () => {
  // From equal to about −0.8 pawn: a drop of about 7.5 points
  const before = 0
  const after = -80

  it('counts an error against the given threshold', () => {
    expect(winChanceDrop(before, after)).toBeGreaterThan(7)
    expect(isError(before, after)).toBe(false)
    expect(isError(before, after, 5)).toBe(true)
  })

  it('judges a valid move against the given threshold', () => {
    expect(isValidMove(before, after)).toBe(false)
    expect(isValidMove(before, after, 8)).toBe(true)
  })
})
