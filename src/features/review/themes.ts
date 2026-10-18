import type { Mistake } from './analyze'
import { MATE_CP, winChance } from './errors'

/**
 * Themes of an error: tags, not categories (a missed mate in a rook endgame has three). Each one
 * has a plain rule on the position before the error, from the player's side. See
 * docs/decisions.md.
 */

export type Theme =
  | 'opening'
  | 'advantage'
  | 'resilience'
  | 'endgame'
  | 'pawnEndgame'
  | 'rookEndgame'
  | 'minorEndgame'
  | 'queenEndgame'
  | 'findMate'
  | 'avoidMate'
  | 'timeTrouble'

export const THEMES: Theme[] = [
  'opening',
  'advantage',
  'resilience',
  'endgame',
  'pawnEndgame',
  'rookEndgame',
  'minorEndgame',
  'queenEndgame',
  'findMate',
  'avoidMate',
  'timeTrouble',
]

/** Opening: errors up to this move number (the training sets it, 1 to 20). */
export const OPENING_MOVES = { min: 1, max: 20, default: 12 } as const
/** Winning chances (%) from which the player is better, and up to which they are worse. */
export const ADVANTAGE_MIN = 63
export const RESILIENCE_MAX = 37
/** Endgame: at most this many pieces besides kings and pawns, both sides together (Lichess). */
export const ENDGAME_MAX_PIECES = 6
/** Time trouble: under this share of the game's expected length left on the clock. */
export const TIME_TROUBLE_SHARE = 0.1

/** Pieces on the board besides kings and pawns, by kind (both sides). */
function material(fen: string): Record<'n' | 'b' | 'r' | 'q', number> {
  const counts = { n: 0, b: 0, r: 0, q: 0 }
  for (const char of fen.split(' ')[0]!.toLowerCase()) {
    if (char in counts) counts[char as keyof typeof counts]++
  }
  return counts
}

/** The themes of an error; the opening depends on how many moves count as the opening. */
export function mistakeThemes(
  mistake: Pick<Mistake, 'fen' | 'ply' | 'beforeCp' | 'afterCp' | 'clock'>,
  openingMoves: number = OPENING_MOVES.default,
): Theme[] {
  const themes: Theme[] = []
  // ply = half-moves played before: the error is on move number floor(ply / 2) + 1.
  if (Math.floor(mistake.ply / 2) + 1 <= openingMoves) themes.push('opening')

  const chances = winChance(mistake.beforeCp)
  if (chances >= ADVANTAGE_MIN) themes.push('advantage')
  if (chances <= RESILIENCE_MAX) themes.push('resilience')

  const { n, b, r, q } = material(mistake.fen)
  if (n + b + r + q <= ENDGAME_MAX_PIECES) {
    themes.push('endgame')
    if (n + b + r + q === 0) themes.push('pawnEndgame')
    else if (r > 0 && n + b + q === 0) themes.push('rookEndgame')
    else if (n + b > 0 && r + q === 0) themes.push('minorEndgame')
    else if (q > 0 && n + b + r === 0) themes.push('queenEndgame')
  }

  // Mate scores are ±MATE_CP: the player had a forced mate and no longer has one…
  if (mistake.beforeCp >= MATE_CP && mistake.afterCp < MATE_CP) themes.push('findMate')
  // …or now gets mated, which was not already the case.
  if (mistake.afterCp <= -MATE_CP && mistake.beforeCp > -MATE_CP) themes.push('avoidMate')

  if (mistake.clock && mistake.clock.remaining < TIME_TROUBLE_SHARE * mistake.clock.total) {
    themes.push('timeTrouble')
  }
  return themes
}

/** How many errors each theme holds (themes overlap: the counts add up to more). */
export function themeCounts(
  mistakes: Pick<Mistake, 'fen' | 'ply' | 'beforeCp' | 'afterCp' | 'clock'>[],
  openingMoves: number = OPENING_MOVES.default,
): Record<Theme, number> {
  const counts = Object.fromEntries(THEMES.map((theme) => [theme, 0])) as Record<Theme, number>
  for (const mistake of mistakes) {
    for (const theme of mistakeThemes(mistake, openingMoves)) counts[theme]++
  }
  return counts
}
