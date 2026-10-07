/**
 * Deletes everything ChessMe keeps in this browser's localStorage (language choice, recent
 * searches, analysis settings, training options). The app's offline files (service worker cache) are left alone.
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
