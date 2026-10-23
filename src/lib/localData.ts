import { deleteDatabase } from '@/lib/db'

/**
 * Deletes everything CraftYourChess keeps in this browser: localStorage (language choice, recent
 * searches, analysis settings, training options, board look) and the IndexedDB database
 * (accounts' games, analysis cache). The app's offline files (service worker cache) are left alone.
 * False if something could not be deleted.
 */
export async function clearLocalData(): Promise<boolean> {
  let cleared = true
  try {
    localStorage.clear()
  } catch {
    cleared = false
  }
  try {
    await deleteDatabase()
  } catch {
    cleared = false
  }
  return cleared
}

const LEGACY_PREFIX = 'chessme:'
const PREFIX = 'craftyourchess:'

/**
 * The app was called ChessMe: moves the values saved under the old key names to the new ones,
 * once, so nobody loses their settings. A value already saved under the new name wins.
 */
export function migrateLegacyKeys(storage: Storage = localStorage): void {
  try {
    const legacy = Object.keys(storage).filter((key) => key.startsWith(LEGACY_PREFIX))
    for (const key of legacy) {
      const renamed = PREFIX + key.slice(LEGACY_PREFIX.length)
      const value = storage.getItem(key)
      if (value !== null && storage.getItem(renamed) === null) storage.setItem(renamed, value)
      storage.removeItem(key)
    }
  } catch {
    // Storage unavailable (private mode…): nothing to migrate.
  }
}
