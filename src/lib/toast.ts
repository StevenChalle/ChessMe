/**
 * Short notifications at the bottom of the screen, gone after a few seconds: confirm what was
 * just done elsewhere than where the player looks (Toaster, mounted at the root).
 */

/**
 * A title, and a few short items under it (side by side on a wide screen, one per line on a
 * phone); `leaving` while it fades out.
 */
export type Toast = { id: number; title: string; items: string[]; leaving?: boolean }

/** How long a notification stays */
export const TOAST_MS = 4000
/** How long it takes to fade out (Toaster's exit animation) */
export const TOAST_EXIT_MS = 150

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Fades the notification out, then removes it. */
export function dismissToast(id: number): void {
  // Closed by hand already: its timer has nothing left to do.
  if (!toasts.some((toast) => toast.id === id && !toast.leaving)) return
  toasts = toasts.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
  notify()
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id)
    notify()
  }, TOAST_EXIT_MS)
}

/** Shows `title` (and `items` under it) for a few seconds. */
export function showToast(title: string, items: string[] = []): void {
  const toast = { id: nextId++, title, items }
  toasts = [...toasts, toast]
  notify()
  setTimeout(() => dismissToast(toast.id), TOAST_MS)
}

export function getToasts(): Toast[] {
  return toasts
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
