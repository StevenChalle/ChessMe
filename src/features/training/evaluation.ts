import { MATE_CP } from '@/features/review/errors'
import { formatSignedTenths } from '@/lib/format'

/**
 * Evaluations shown while training, in pawns from White's side as usual in chess: "+1.5" White
 * is better, "-0.3" Black is. Mates (±MATE_CP) read "+#" (White mates) or "-#" (Black mates).
 */
export function formatEval(cp: number): string {
  if (Math.abs(cp) >= MATE_CP) return cp > 0 ? '+#' : '-#'
  return formatSignedTenths(cp / 100)
}

/** Change from the position's evaluation; undefined when a mate makes it meaningless. */
export function evalDelta(fromCp: number, toCp: number): number | undefined {
  if (Math.abs(fromCp) >= MATE_CP || Math.abs(toCp) >= MATE_CP) return undefined
  return toCp - fromCp
}

export function formatDelta(deltaCp: number): string {
  return formatSignedTenths(deltaCp / 100)
}
