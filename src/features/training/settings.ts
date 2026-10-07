import { ERROR_RANGE } from '@/features/review/criteria'
import type { TrainingOptions } from './order'

/**
 * The training options last launched, per browser (localStorage), to start from next time.
 * Declared on the /legal page; cleared by clearLocalData().
 */

const STORAGE_KEY = 'chessme:training-settings'
const VERSION = 1

/** As the options screen edits them: the games limit keeps its number while unchecked. */
export type TrainingSettings = {
  interleaveGames: boolean
  shuffleWithinGame: boolean
  limitGames: boolean
  gamesLimit: number
  /** undefined: the analysis's own error threshold (every error) */
  minDrop?: number
}

export const DEFAULT_GAMES_LIMIT = 5

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = {
  interleaveGames: false,
  shuffleWithinGame: false,
  limitGames: false,
  gamesLimit: DEFAULT_GAMES_LIMIT,
}

/** The options of a training on an analysis judged with `errorMinDrop`. */
export function toTrainingOptions(
  settings: TrainingSettings,
  errorMinDrop: number,
): TrainingOptions {
  return {
    interleaveGames: settings.interleaveGames,
    shuffleWithinGame: settings.shuffleWithinGame,
    maxGames: settings.limitGames ? settings.gamesLimit : undefined,
    // Never below the analysis's threshold: there are no errors under it.
    minDrop: Math.max(settings.minDrop ?? errorMinDrop, errorMinDrop),
  }
}

/** Saved settings over the defaults, field by field: anything missing or invalid falls back. */
export function parseTrainingSettings(raw: string | null): TrainingSettings {
  const defaults = DEFAULT_TRAINING_SETTINGS
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
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback
  const { gamesLimit, minDrop } = data
  return {
    interleaveGames: flag(data.interleaveGames, defaults.interleaveGames),
    shuffleWithinGame: flag(data.shuffleWithinGame, defaults.shuffleWithinGame),
    limitGames: flag(data.limitGames, defaults.limitGames),
    gamesLimit:
      Number.isInteger(gamesLimit) && (gamesLimit as number) >= 1
        ? (gamesLimit as number)
        : defaults.gamesLimit,
    minDrop:
      typeof minDrop === 'number' && minDrop >= ERROR_RANGE.min && minDrop <= ERROR_RANGE.max
        ? minDrop
        : undefined,
  }
}

export function loadTrainingSettings(): TrainingSettings {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode, blocked site data): defaults
  }
  return parseTrainingSettings(raw)
}

export function saveTrainingSettings(settings: TrainingSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...settings }))
  } catch {
    // Not saved: the settings still apply to this training
  }
}
