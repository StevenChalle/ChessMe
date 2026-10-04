import type { Color } from 'chessops'
import type { GameResult } from '@/features/games/normalize'
import { CATEGORIES, type Category } from '@/features/player/summary'
import type { ApiSource } from '@/lib/http'
import { DEFAULT_CRITERIA, normalizeCriteria, type ReviewCriteria } from './criteria'
import {
  ALL_COLORS,
  ALL_RESULTS,
  DATE_PRESETS,
  defaultSelection,
  type GameScope,
  type GameSelection,
} from './selection'

/**
 * The advanced review's last settings, per browser (localStorage), to start from next time.
 * Declared on the /legal page; cleared by clearLocalData().
 */

const STORAGE_KEY = 'chessme:review-settings'
const VERSION = 1

export type ReviewSettings = { selection: GameSelection; criteria: ReviewCriteria }

const SOURCES: ApiSource[] = ['lichess', 'chesscom']

function pick<T>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const kept = allowed.filter((item) => value.includes(item))
  return kept.length > 0 ? kept : undefined
}

function parseScope(value: unknown): GameScope | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const scope = value as Record<string, unknown>
  if (scope.kind === 'latest' && Number.isInteger(scope.count) && (scope.count as number) >= 1) {
    return { kind: 'latest', count: scope.count as number }
  }
  if (scope.kind === 'range' && typeof scope.from === 'number' && typeof scope.to === 'number') {
    const preset = DATE_PRESETS.find((item) => item === scope.preset)
    return { kind: 'range', from: scope.from, to: scope.to, ...(preset && { preset }) }
  }
  return undefined
}

/**
 * Saved settings over the defaults, field by field: anything missing or invalid falls back.
 * Platforms are limited to the accounts available now (all of them if none of the saved ones).
 */
export function parseReviewSettings(raw: string | null, available: ApiSource[]): ReviewSettings {
  const defaults = { selection: defaultSelection(available), criteria: DEFAULT_CRITERIA }
  if (!raw) return defaults
  let data: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return defaults
    data = parsed as Record<string, unknown>
  } catch {
    return defaults
  }
  if (data.version !== VERSION) return defaults

  const saved = (typeof data.selection === 'object' && data.selection) || {}
  const s = saved as Record<string, unknown>
  const sources = (pick(s.sources, SOURCES) ?? []).filter((source) => available.includes(source))
  const selection: GameSelection = {
    sources: sources.length > 0 ? sources : defaults.selection.sources,
    scope: parseScope(s.scope) ?? defaults.selection.scope,
    categories: pick<Category>(s.categories, CATEGORIES) ?? defaults.selection.categories,
    colors: pick<Color>(s.colors, ALL_COLORS) ?? defaults.selection.colors,
    results: pick<GameResult>(s.results, ALL_RESULTS) ?? defaults.selection.results,
    minMoves:
      Number.isInteger(s.minMoves) && (s.minMoves as number) >= 0
        ? (s.minMoves as number)
        : defaults.selection.minMoves,
  }

  const c = (typeof data.criteria === 'object' && data.criteria) || {}
  const { errorMinDrop, validMaxDrop } = c as Record<string, unknown>
  const criteria =
    typeof errorMinDrop === 'number' && typeof validMaxDrop === 'number'
      ? normalizeCriteria({ errorMinDrop, validMaxDrop })
      : DEFAULT_CRITERIA

  return { selection, criteria }
}

export function loadReviewSettings(available: ApiSource[]): ReviewSettings {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode, blocked site data): defaults
  }
  return parseReviewSettings(raw, available)
}

export function saveReviewSettings(settings: ReviewSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...settings }))
  } catch {
    // Not saved: the settings still apply to this review
  }
}
