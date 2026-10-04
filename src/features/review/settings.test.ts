import { describe, expect, it } from 'vitest'
import { DEFAULT_CRITERIA } from './criteria'
import { defaultSelection } from './selection'
import { parseReviewSettings } from './settings'

const both = ['lichess', 'chesscom'] as const

const saved = (data: object) => JSON.stringify({ version: 1, ...data })

describe('parseReviewSettings', () => {
  it('falls back to the defaults without valid storage', () => {
    const defaults = { selection: defaultSelection([...both]), criteria: DEFAULT_CRITERIA }
    expect(parseReviewSettings(null, [...both])).toEqual(defaults)
    expect(parseReviewSettings('not json', [...both])).toEqual(defaults)
    expect(parseReviewSettings(JSON.stringify({ version: 99 }), [...both])).toEqual(defaults)
  })

  it('restores saved settings', () => {
    const settings = parseReviewSettings(
      saved({
        selection: {
          sources: ['chesscom'],
          scope: { kind: 'range', from: 1, to: 2, preset: 'month' },
          categories: ['blitz'],
          colors: ['black'],
          results: ['loss'],
          minMoves: 10,
        },
        criteria: { errorMinDrop: 15, validMaxDrop: 4 },
      }),
      [...both],
    )
    expect(settings).toEqual({
      selection: {
        sources: ['chesscom'],
        scope: { kind: 'range', from: 1, to: 2, preset: 'month' },
        categories: ['blitz'],
        colors: ['black'],
        results: ['loss'],
        minMoves: 10,
      },
      criteria: { errorMinDrop: 15, validMaxDrop: 4 },
    })
  })

  it('replaces invalid fields one by one', () => {
    const settings = parseReviewSettings(
      saved({
        selection: {
          categories: ['hyperbullet'],
          minMoves: -3,
          scope: { kind: 'latest', count: 0 },
        },
        criteria: { errorMinDrop: 4, validMaxDrop: 9 },
      }),
      [...both],
    )
    expect(settings.selection.categories).toEqual(defaultSelection([...both]).categories)
    expect(settings.selection.minMoves).toBe(0)
    expect(settings.selection.scope).toEqual({ kind: 'latest', count: 10 })
    // Kept consistent: a valid move stays below an error
    expect(settings.criteria).toEqual({ errorMinDrop: 4, validMaxDrop: 3 })
  })

  it('only keeps platforms with an account now', () => {
    const raw = saved({ selection: { sources: ['lichess'] } })
    expect(parseReviewSettings(raw, ['chesscom']).selection.sources).toEqual(['chesscom'])
    expect(parseReviewSettings(raw, [...both]).selection.sources).toEqual(['lichess'])
  })
})
