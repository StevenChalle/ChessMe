import { describe, expect, it } from 'vitest'
import type { GameSummary } from '@/features/games/normalize'
import {
  datePresetRange,
  defaultSelection,
  isSelectionValid,
  matchesSelection,
  resolveScope,
  type GameSelection,
} from './selection'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 5, 12)

function game(overrides: Partial<GameSummary> = {}): GameSummary {
  return {
    source: 'lichess',
    id: 'g',
    url: 'https://lichess.org/g',
    playedAt: new Date(NOW - DAY),
    category: 'blitz',
    timeControl: { kind: 'clock', initial: 180, increment: 0 },
    rated: true,
    color: 'white',
    opponent: { name: 'bob', rating: 1500 },
    result: 'loss',
    ...overrides,
  }
}

const all = defaultSelection(['lichess', 'chesscom'])

describe('matchesSelection', () => {
  it('keeps everything with the defaults', () => {
    expect(matchesSelection(game(), all)).toBe(true)
  })

  it('filters platform, rated or casual, time control, color and result', () => {
    expect(matchesSelection(game(), { ...all, sources: ['chesscom'] })).toBe(false)
    expect(matchesSelection(game(), { ...all, ratings: ['casual'] })).toBe(false)
    expect(matchesSelection(game({ rated: false }), { ...all, ratings: ['casual'] })).toBe(true)
    expect(matchesSelection(game(), { ...all, categories: ['bullet'] })).toBe(false)
    expect(matchesSelection(game(), { ...all, colors: ['black'] })).toBe(false)
    expect(matchesSelection(game(), { ...all, results: ['win', 'draw'] })).toBe(false)
  })

  it('keeps opponents rated within the range, bounds included', () => {
    const range = (min: number, max: number): GameSelection => ({
      ...all,
      opponentRating: { enabled: true, min, max },
    })
    expect(matchesSelection(game(), range(1500, 1600))).toBe(true)
    expect(matchesSelection(game(), range(1400, 1500))).toBe(true)
    expect(matchesSelection(game(), range(1501, 4000))).toBe(false)
    expect(matchesSelection(game({ opponent: { name: 'anon' } }), range(0, 4000))).toBe(false)
  })

  it('ignores the rating range while it is off or rated games are not chosen', () => {
    const narrow = { enabled: true, min: 2000, max: 2100 }
    expect(
      matchesSelection(game(), { ...all, opponentRating: { ...narrow, enabled: false } }),
    ).toBe(true)
    expect(
      matchesSelection(game({ rated: false }), {
        ...all,
        ratings: ['casual'],
        opponentRating: narrow,
      }),
    ).toBe(true)
  })

  it('checks the date range on the end date', () => {
    const range: GameSelection = {
      ...all,
      scope: { kind: 'range', from: NOW - 2 * DAY, to: NOW },
    }
    expect(matchesSelection(game(), range)).toBe(true)
    expect(matchesSelection(game({ playedAt: new Date(NOW - 3 * DAY) }), range)).toBe(false)
  })
})

describe('date presets', () => {
  it('starts today at local midnight', () => {
    const { from, to } = datePresetRange('today', NOW)
    expect(to).toBe(NOW)
    expect(new Date(from).getHours()).toBe(0)
    expect(NOW - from).toBeLessThan(DAY)
  })

  it('goes back a week, or calendar months, from now', () => {
    expect(datePresetRange('week', NOW)).toEqual({ from: NOW - 7 * DAY, to: NOW })
    expect(new Date(datePresetRange('month', NOW).from).getUTCMonth()).toBe(8)
    expect(new Date(datePresetRange('year', NOW).from).getUTCFullYear()).toBe(2025)
  })

  it('recomputes a saved preset against the current date', () => {
    const saved = { kind: 'range' as const, from: 0, to: 1, preset: 'week' as const }
    expect(resolveScope(saved, NOW)).toEqual({ ...saved, from: NOW - 7 * DAY, to: NOW })
    const custom = { kind: 'range' as const, from: 0, to: 1 }
    expect(resolveScope(custom, NOW)).toBe(custom)
  })
})

describe('isSelectionValid', () => {
  it('needs something to look for', () => {
    expect(isSelectionValid(all)).toBe(true)
    expect(isSelectionValid({ ...all, sources: [] })).toBe(false)
    expect(isSelectionValid({ ...all, ratings: [] })).toBe(false)
    expect(isSelectionValid({ ...all, categories: [] })).toBe(false)
    expect(isSelectionValid({ ...all, scope: { kind: 'latest', count: 0 } })).toBe(false)
    expect(isSelectionValid({ ...all, scope: { kind: 'range', from: 2, to: 1 } })).toBe(false)
    expect(isSelectionValid({ ...all, scope: { kind: 'range', from: 1, to: 2, max: 0 } })).toBe(
      false,
    )
    expect(isSelectionValid({ ...all, scope: { kind: 'range', from: 1, to: 2, max: 5 } })).toBe(
      true,
    )
  })

  it('needs a sound rating range, only while the filter is in force', () => {
    const range = (min: number, max: number, enabled = true): GameSelection => ({
      ...all,
      opponentRating: { enabled, min, max },
    })
    expect(isSelectionValid(range(1200, 1800))).toBe(true)
    expect(isSelectionValid(range(1800, 1200))).toBe(false)
    expect(isSelectionValid(range(-1, 1200))).toBe(false)
    expect(isSelectionValid(range(0, 4001))).toBe(false)
    expect(isSelectionValid(range(Number.NaN, 1200))).toBe(false)
    expect(isSelectionValid(range(1800, 1200, false))).toBe(true)
    expect(isSelectionValid({ ...range(1800, 1200), ratings: ['casual'] })).toBe(true)
  })
})
