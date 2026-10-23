/**
 * The "evaluate the position" exercise: the player says how the position stands, in one of five
 * words, and the engine's evaluation (centipawns, White's side) settles it. Equal within ±0.3,
 * better up to 2.0, winning from 2.0. Engines vary by a few tenths from one search to the next:
 * near a boundary, both words around it are accepted (±0.15 around ±0.3, ±0.3 around ±2.0). A mate
 * is winning.
 */

export type Assessment =
  'white-winning' | 'black-winning' | 'white-better' | 'black-better' | 'equal'

export const EQUAL_MAX_CP = 30
export const WINNING_MIN_CP = 200

/** Each boundary (centipawns, White's side) and the margin around it. */
const BOUNDARIES = [
  { cp: EQUAL_MAX_CP, margin: 15 },
  { cp: WINNING_MIN_CP, margin: 30 },
  { cp: -EQUAL_MAX_CP, margin: 15 },
  { cp: -WINNING_MIN_CP, margin: 30 },
]

/** The word for this evaluation, without any margin. */
export function assess(whiteCp: number): Assessment {
  const side = whiteCp > 0 ? 'white' : 'black'
  const size = Math.abs(whiteCp)
  if (size <= EQUAL_MAX_CP) return 'equal'
  return size < WINNING_MIN_CP ? `${side}-better` : `${side}-winning`
}

/** The words accepted for this evaluation: its own, and its neighbor near a boundary. */
export function acceptedAssessments(whiteCp: number): Assessment[] {
  const accepted = new Set([assess(whiteCp)])
  for (const { cp, margin } of BOUNDARIES) {
    if (Math.abs(whiteCp - cp) > margin) continue
    // The words on both sides of the boundary.
    accepted.add(assess(cp - Math.sign(cp)))
    accepted.add(assess(cp + Math.sign(cp)))
  }
  return [...accepted]
}

export function isAccepted(answer: Assessment, whiteCp: number): boolean {
  return acceptedAssessments(whiteCp).includes(answer)
}
