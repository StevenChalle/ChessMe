/**
 * Deletes everything CraftYourChess keeps in this browser's localStorage (language choice, recent
 * searches, analysis settings, training options, board look). The app's offline files (service worker cache) are left alone.
 * When IndexedDB data arrives (imported games), delete it here too.
 */
export function clearLocalData(): boolean {
  try {
    localStorage.clear()
    return true
  } catch {
    return false
  }
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
