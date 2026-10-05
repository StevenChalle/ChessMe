import type { Color } from 'chessops'
import type { GameResult, GameSummary } from '@/features/games/normalize'
import { CATEGORIES, type Category } from '@/features/player/summary'
import type { ApiSource } from '@/lib/http'

/**
 * Which games the advanced review analyses. Platforms, time controls and dates are also sent to
 * the APIs when they support it; everything is checked again here (matchesSelection).
 */

export type DatePreset = 'today' | 'week' | 'month' | '3months' | 'year'

export type GameScope =
  /** The `count` latest games matching the filters, all platforms together */
  | { kind: 'latest'; count: number }
  /**
   * Games that ended in [from, to] (Unix ms), the `max` latest of them if set. `preset` keeps the
   * range relative when saved.
   */
  | { kind: 'range'; from: number; to: number; preset?: DatePreset; max?: number }

/** Rated games, casual games, or both */
export type RatingKind = 'rated' | 'casual'

export type GameSelection = {
  sources: ApiSource[]
  ratings: RatingKind[]
  scope: GameScope
  categories: Category[]
  colors: Color[]
  results: GameResult[]
  /** Games shorter than this many moves (full moves) are left out; 0 keeps them all. */
  minMoves: number
}

export const ALL_RATINGS: RatingKind[] = ['rated', 'casual']
export const ALL_COLORS: Color[] = ['white', 'black']
export const ALL_RESULTS: GameResult[] = ['win', 'draw', 'loss']
export const LATEST_SHORTCUTS = [10, 25, 50, 100] as const
export const DATE_PRESETS: DatePreset[] = ['today', 'week', 'month', '3months', 'year']
/** The period's maximum when first chosen (it can be cleared: no limit). */
export const DEFAULT_RANGE_MAX = 50
/** From this many games, the recap warns that nothing is saved yet. */
export const LARGE_REVIEW = 100

export function defaultSelection(sources: ApiSource[]): GameSelection {
  return {
    sources,
    ratings: [...ALL_RATINGS],
    scope: { kind: 'latest', count: 10 },
    categories: [...CATEGORIES],
    colors: [...ALL_COLORS],
    results: [...ALL_RESULTS],
    minMoves: 0,
  }
}

const DAY = 86_400_000

/** [from, to] for a preset, ending now (Unix ms). Today starts at local midnight; months are calendar months back. */
export function datePresetRange(preset: DatePreset, now: number): { from: number; to: number } {
  const start = new Date(now)
  if (preset === 'today') {
    start.setHours(0, 0, 0, 0)
    return { from: start.getTime(), to: now }
  }
  if (preset === 'week') return { from: now - 7 * DAY, to: now }
  if (preset === 'month') start.setMonth(start.getMonth() - 1)
  else if (preset === '3months') start.setMonth(start.getMonth() - 3)
  else start.setFullYear(start.getFullYear() - 1)
  return { from: start.getTime(), to: now }
}

/** A preset range is recomputed against `now`, so a saved "last week" stays the last week. */
export function resolveScope(scope: GameScope, now: number): GameScope {
  if (scope.kind === 'range' && scope.preset) {
    return { ...scope, ...datePresetRange(scope.preset, now) }
  }
  return scope
}

/** Full moves played in a game of `plies` half-moves. */
export function fullMoves(plies: number): number {
  return Math.ceil(plies / 2)
}

/** Filters that only this app can check (the date range too, on the game's end date). */
export function matchesSelection(
  game: GameSummary & { sanMoves: string[] },
  selection: GameSelection,
): boolean {
  const { scope } = selection
  if (scope.kind === 'range') {
    const playedAt = game.playedAt.getTime()
    if (playedAt < scope.from || playedAt > scope.to) return false
  }
  return (
    selection.sources.includes(game.source) &&
    selection.ratings.includes(game.rated ? 'rated' : 'casual') &&
    selection.categories.includes(game.category) &&
    selection.colors.includes(game.color) &&
    selection.results.includes(game.result) &&
    fullMoves(game.sanMoves.length) >= selection.minMoves
  )
}

/** Something to look for: at least one platform, kind of game, time control, color and result. */
export function isSelectionValid(selection: GameSelection): boolean {
  const { scope } = selection
  const scopeOk =
    scope.kind === 'latest'
      ? Number.isInteger(scope.count) && scope.count >= 1
      : scope.from <= scope.to &&
        (scope.max === undefined || (Number.isInteger(scope.max) && scope.max >= 1))
  return (
    scopeOk &&
    selection.sources.length > 0 &&
    selection.ratings.length > 0 &&
    selection.categories.length > 0 &&
    selection.colors.length > 0 &&
    selection.results.length > 0 &&
    selection.minMoves >= 0
  )
}
