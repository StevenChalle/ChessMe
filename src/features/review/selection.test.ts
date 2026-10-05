import { describe, expect, it } from 'vitest'
import type { GameSummary } from '@/features/games/normalize'
import {
  datePresetRange,
  defaultSelection,
  fullMoves,
  isSelectionValid,
  matchesSelection,
  resolveScope,
  type GameSelection,
} from './selection'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 5, 12)

function game(
  overrides: Partial<GameSummary> = {},
  plies = 60,
): GameSummary & { sanMoves: string[] } {
  return {
    source: 'lichess',
    id: 'g',
    url: 'https://lichess.org/g',
    playedAt: new Date(NOW - DAY),
    category: 'blitz',
    timeControl: { kind: 'clock', initial: 180, increment: 0 },
    rated: true,
    color: 'white',
    opponent: { name: 'bob' },
    result: 'loss',
    sanMoves: Array.from({ length: plies }, () => 'e4'),
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

  it('leaves out games shorter than the minimum, in full moves', () => {
    const short = game({}, 19) // 10 moves
    expect(fullMoves(19)).toBe(10)
    expect(matchesSelection(short, { ...all, minMoves: 10 })).toBe(true)
    expect(matchesSelection(short, { ...all, minMoves: 11 })).toBe(false)
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
  })
})
