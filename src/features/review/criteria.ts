import { ERROR_MIN_DROP, VALID_MAX_DROP } from './errors'

/**
 * What counts as an error and as a valid move, in winning chances lost (0 to 100 scale, see
 * errors.ts). Adjustable in the advanced review; the quick review always uses the defaults.
 */
export type ReviewCriteria = {
  /** A player's move losing at least this much is an error */
  errorMinDrop: number
  /** In training, a move losing at most this (vs the best move) is valid */
  validMaxDrop: number
}

export const DEFAULT_CRITERIA: ReviewCriteria = {
  errorMinDrop: ERROR_MIN_DROP,
  validMaxDrop: VALID_MAX_DROP,
}

export const ERROR_RANGE = { min: 3, max: 30 } as const
export const VALID_RANGE = { min: 1, max: ERROR_RANGE.max - 1 } as const

/**
 * Lichess's judgements on our scale, as landmarks for the error slider. Lichess compares winning
 * chances on a −1..1 scale with thresholds 0.1 / 0.2 / 0.3 (lila Advice.scala), i.e. 5 / 10 / 15
 * on our 0..100 scale.
 */
export const LICHESS_MARKERS = { inaccuracy: 5, mistake: 10, blunder: 15 } as const

/**
 * Moves losing at least this much in the quick pass get a deep look: a margin below the error
 * threshold (6 for the default 10).
 */
export function deepCheckMinDrop(criteria: ReviewCriteria): number {
  return Math.max(1, criteria.errorMinDrop - 4)
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Rounds and bounds both thresholds, keeping the valid one strictly below the error one: a move
 * losing exactly as much as both would otherwise be an error in the game and a valid answer in
 * training (valid ⇔ drop ≤ validMaxDrop, error ⇔ drop ≥ errorMinDrop).
 * `changed` tells which one the user just moved: the other one gives way.
 */
export function normalizeCriteria(
  criteria: ReviewCriteria,
  changed: keyof ReviewCriteria = 'errorMinDrop',
): ReviewCriteria {
  let errorMinDrop = clamp(Math.round(criteria.errorMinDrop), ERROR_RANGE.min, ERROR_RANGE.max)
  let validMaxDrop = clamp(Math.round(criteria.validMaxDrop), VALID_RANGE.min, VALID_RANGE.max)
  if (validMaxDrop >= errorMinDrop) {
    if (changed === 'errorMinDrop') validMaxDrop = Math.max(VALID_RANGE.min, errorMinDrop - 1)
    else errorMinDrop = Math.min(ERROR_RANGE.max, validMaxDrop + 1)
  }
  return { errorMinDrop, validMaxDrop }
}
