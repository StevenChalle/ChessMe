import { detectDevice, type DeviceKind } from '@/lib/device'

/**
 * How much the browser keeps, by kind of device: ambitious enough never to be felt, and once
 * reached, the oldest data makes room for the newest (docs/decisions.md, 2026-10-23).
 * About 250 bytes a position and 3 KB a game: some 800 MB on a computer, 120 MB on a phone.
 */
export type StorageLimits = {
  /** Accounts' games (game store): the least recently searched accounts go first, then the oldest games */
  storedGames: number
  /** Evaluated positions (analysis cache): the least recently used go first */
  positions: number
  /** Analysed games (analysis cache): the least recently analysed go first */
  analysedGames: number
}

export const STORAGE_LIMITS: Record<DeviceKind, StorageLimits> = {
  desktop: { storedGames: 100_000, positions: 2_000_000, analysedGames: 50_000 },
  mobile: { storedGames: 15_000, positions: 300_000, analysedGames: 8_000 },
}

export function storageLimits(device: DeviceKind = detectDevice()): StorageLimits {
  return STORAGE_LIMITS[device]
}
