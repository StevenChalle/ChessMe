import { ERROR_RANGE } from '@/features/review/criteria'
import { OPENING_MOVES, THEMES, type Theme } from '@/features/review/themes'
import type { TrainingOptions } from './order'

/**
 * The training options last launched, per browser (localStorage), to start from next time.
 * Declared on the /legal page; cleared by clearLocalData().
 */

const STORAGE_KEY = 'craftyourchess:training-settings'
const VERSION = 1

/**
 * What the player does on each position: say how it stands, find a valid move, or both (in that
 * order). Never neither.
 */
export type Exercise = 'evaluate' | 'replay'
export const EXERCISES: Exercise[] = ['evaluate', 'replay']

/** As the options screen edits them: the limits keep their number while unchecked. */
export type TrainingSettings = {
  exercises: Exercise[]
  interleaveGames: boolean
  shuffleWithinGame: boolean
  /** A single position of each game: at random, or its first one with `firstOfGame` */
  onePerGame: boolean
  firstOfGame: boolean
  limitGames: boolean
  gamesLimit: number
  limitPositions: boolean
  positionsLimit: number
  /** undefined: the analysis's own error threshold (every error) */
  minDrop?: number
  /** Only the errors having all of them; none: every error */
  themes: Theme[]
  openingMoves: number
}

export const DEFAULT_GAMES_LIMIT = 5
export const DEFAULT_POSITIONS_LIMIT = 10

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = {
  exercises: ['replay'],
  interleaveGames: false,
  shuffleWithinGame: false,
  onePerGame: false,
  firstOfGame: false,
  limitGames: false,
  gamesLimit: DEFAULT_GAMES_LIMIT,
  limitPositions: false,
  positionsLimit: DEFAULT_POSITIONS_LIMIT,
  themes: [],
  openingMoves: OPENING_MOVES.default,
}

/** The options of a training on an analysis judged with `errorMinDrop`. */
export function toTrainingOptions(
  settings: TrainingSettings,
  errorMinDrop: number,
): TrainingOptions {
  return {
    interleaveGames: settings.interleaveGames,
    // One position per game: nothing to shuffle within a game.
    shuffleWithinGame: settings.shuffleWithinGame && !settings.onePerGame,
    onePerGame: settings.onePerGame ? (settings.firstOfGame ? 'first' : 'random') : undefined,
    maxGames: settings.limitGames ? settings.gamesLimit : undefined,
    maxPositions: settings.limitPositions ? settings.positionsLimit : undefined,
    // Never below the analysis's threshold: there are no errors under it.
    minDrop: Math.max(settings.minDrop ?? errorMinDrop, errorMinDrop),
    themes: settings.themes,
    openingMoves: settings.openingMoves,
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
  const { exercises, gamesLimit, positionsLimit, minDrop, themes, openingMoves } = data
  const chosen = Array.isArray(exercises)
    ? EXERCISES.filter((exercise) => exercises.includes(exercise))
    : []
  const count = (value: unknown, fallback: number) =>
    Number.isInteger(value) && (value as number) >= 1 ? (value as number) : fallback
  return {
    exercises: chosen.length > 0 ? chosen : defaults.exercises,
    interleaveGames: flag(data.interleaveGames, defaults.interleaveGames),
    shuffleWithinGame: flag(data.shuffleWithinGame, defaults.shuffleWithinGame),
    onePerGame: flag(data.onePerGame, defaults.onePerGame),
    firstOfGame: flag(data.firstOfGame, defaults.firstOfGame),
    limitGames: flag(data.limitGames, defaults.limitGames),
    gamesLimit: count(gamesLimit, defaults.gamesLimit),
    limitPositions: flag(data.limitPositions, defaults.limitPositions),
    positionsLimit: count(positionsLimit, defaults.positionsLimit),
    minDrop:
      typeof minDrop === 'number' && minDrop >= ERROR_RANGE.min && minDrop <= ERROR_RANGE.max
        ? minDrop
        : undefined,
    themes: Array.isArray(themes) ? THEMES.filter((theme) => themes.includes(theme)) : [],
    openingMoves:
      Number.isInteger(openingMoves) &&
      (openingMoves as number) >= OPENING_MOVES.min &&
      (openingMoves as number) <= OPENING_MOVES.max
        ? (openingMoves as number)
        : defaults.openingMoves,
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
