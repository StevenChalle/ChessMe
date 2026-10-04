import { DEEP_NODES, QUICK_NODES } from './analyze'
import { deepCheckMinDrop, type ReviewCriteria } from './criteria'
import type { ReviewGame } from './games'

/**
 * Rough analysis time, before launching it. The positions are exact (the games are fetched);
 * the engine speed of a device is not, so it is shown as "≈". See docs/decisions.md.
 */

export type DeviceProfile = {
  /** Engines running in parallel (one per spare core, at most 4) */
  workers: number
  /** Nodes per second of one single-threaded WASM engine */
  nodesPerSecond: number
}

/**
 * desktop: measured on a 20-core PC (4 workers), about 198 M nodes in 60 s for 10 blitz games.
 * mobile: an assumption (2 workers, about 3× slower each) until measured on a real phone.
 */
export const DEVICE_PROFILES = {
  desktop: { workers: 4, nodesPerSecond: 825_000 },
  mobile: { workers: 2, nodesPerSecond: 250_000 },
} satisfies Record<string, DeviceProfile>

/**
 * Share of engine-evaluated positions that get a deep look, by deep-check threshold. About 10 %
 * measured at the default (6); lower thresholds flag many more moves. Rough, to be refined.
 */
export function deepShare(minDrop: number): number {
  if (minDrop >= 11) return 0.05
  if (minDrop >= 6) return 0.1
  if (minDrop >= 4) return 0.15
  if (minDrop >= 2) return 0.25
  return 0.35
}

/** Positions of a game the engine has to evaluate (Lichess's own analysis covers the others). */
export function enginePositions(game: Pick<ReviewGame, 'sanMoves' | 'serverCps'>): number {
  const positions = game.sanMoves.length + 1
  if (positions < 2) return 0
  if (!game.serverCps) return positions
  // Lichess evaluates the position after each move; the start position is never covered.
  return 1 + game.serverCps.filter((cp) => cp === undefined).length
}

export function estimateSeconds(
  games: Pick<ReviewGame, 'sanMoves' | 'serverCps'>[],
  criteria: ReviewCriteria,
  device: DeviceProfile,
): number {
  const perGame = games.map(enginePositions).filter((positions) => positions > 0)
  if (perGame.length === 0) return 0
  const positions = perGame.reduce((sum, count) => sum + count, 0)
  const nodes = positions * (QUICK_NODES + deepShare(deepCheckMinDrop(criteria)) * DEEP_NODES)
  // Each engine works on whole games: a single game keeps a single engine busy.
  const workers = Math.min(device.workers, perGame.length)
  return nodes / (workers * device.nodesPerSecond)
}
