import { describe, expect, it } from 'vitest'
import { DEFAULT_CRITERIA } from './criteria'
import { deepShare, DEVICE_PROFILES, enginePositions, estimateSeconds } from './estimate'

const game = (plies: number, serverCps?: (number | undefined)[]) => ({
  sanMoves: Array.from({ length: plies }, () => 'e4'),
  serverCps,
})

describe('enginePositions', () => {
  it('counts every position of an unanalysed game', () => {
    expect(enginePositions(game(80))).toBe(81)
  })

  it('only counts what Lichess did not evaluate, plus the start position', () => {
    expect(enginePositions(game(4, [10, 20, undefined, 30]))).toBe(2)
  })

  it('needs nothing for a game without moves', () => {
    expect(enginePositions(game(0))).toBe(0)
  })
})

describe('estimateSeconds', () => {
  it('matches the desktop measurement: about a minute for 10 blitz games', () => {
    const games = Array.from({ length: 10 }, () => game(97))
    const seconds = estimateSeconds(games, DEFAULT_CRITERIA, DEVICE_PROFILES.desktop)
    expect(seconds).toBeGreaterThan(40)
    expect(seconds).toBeLessThan(80)
  })

  it('is slower on mobile', () => {
    const games = Array.from({ length: 10 }, () => game(80))
    expect(estimateSeconds(games, DEFAULT_CRITERIA, DEVICE_PROFILES.mobile)).toBeGreaterThan(
      estimateSeconds(games, DEFAULT_CRITERIA, DEVICE_PROFILES.desktop),
    )
  })

  it('keeps a single engine busy for a single game', () => {
    const one = estimateSeconds([game(80)], DEFAULT_CRITERIA, DEVICE_PROFILES.desktop)
    const four = estimateSeconds(
      Array.from({ length: 4 }, () => game(80)),
      DEFAULT_CRITERIA,
      DEVICE_PROFILES.desktop,
    )
    expect(four).toBeCloseTo(one)
  })

  it('grows when lower error thresholds flag more moves for a deep look', () => {
    const games = [game(80)]
    const strict = estimateSeconds(
      games,
      { errorMinDrop: 5, validMaxDrop: 3 },
      DEVICE_PROFILES.desktop,
    )
    expect(strict).toBeGreaterThan(
      estimateSeconds(games, DEFAULT_CRITERIA, DEVICE_PROFILES.desktop),
    )
    expect(deepShare(1)).toBeGreaterThan(deepShare(6))
  })

  it('is zero when Lichess already analysed everything', () => {
    expect(estimateSeconds([game(0)], DEFAULT_CRITERIA, DEVICE_PROFILES.desktop)).toBe(0)
  })
})
