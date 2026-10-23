import { describe, expect, it } from 'vitest'
import { mergePeriods, missingPeriods } from './periods'

describe('mergePeriods', () => {
  it('sorts and merges the periods that overlap or touch', () => {
    expect(
      mergePeriods([
        { from: 20, to: 30 },
        { from: 0, to: 10 },
        { from: 11, to: 15 },
        { from: 25, to: 40 },
        { from: 50, to: 49 },
      ]),
    ).toEqual([
      { from: 0, to: 15 },
      { from: 20, to: 40 },
    ])
  })
})

describe('missingPeriods', () => {
  const covered = [
    { from: 10, to: 20 },
    { from: 30, to: 40 },
  ]

  it('returns the gaps of the wanted period', () => {
    expect(missingPeriods(covered, { from: 0, to: 50 })).toEqual([
      { from: 0, to: 9 },
      { from: 21, to: 29 },
      { from: 41, to: 50 },
    ])
  })

  it('returns nothing when everything is covered', () => {
    expect(missingPeriods(covered, { from: 12, to: 18 })).toEqual([])
    expect(missingPeriods(covered, { from: 30, to: 40 })).toEqual([])
  })

  it('handles a wanted period inside a gap, or with nothing covered', () => {
    expect(missingPeriods(covered, { from: 22, to: 25 })).toEqual([{ from: 22, to: 25 }])
    expect(missingPeriods([], { from: 5, to: 6 })).toEqual([{ from: 5, to: 6 }])
  })
})
