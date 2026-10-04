import { MATE_CP } from '@/features/review/errors'
import { formatSignedTenths } from '@/lib/format'

/**
 * Evaluations shown while training, in pawns from the player's side: "+1.5", "−0.3".
 * Mates (±MATE_CP) read "+#" (the player mates) or "-#" (the player gets mated).
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
