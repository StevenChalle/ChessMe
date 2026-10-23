/**
 * Short notifications at the bottom of the screen, gone after a few seconds: confirm what was
 * just done elsewhere than where the player looks (Toaster, mounted at the root).
 */

export type Toast = { id: number; message: string }

/** How long a notification stays */
export const TOAST_MS = 4000

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function dismissToast(id: number): void {
  // Closed by hand already: its timer has nothing left to do.
  if (!toasts.some((toast) => toast.id === id)) return
  toasts = toasts.filter((toast) => toast.id !== id)
  notify()
}

/** Shows `message` for a few seconds. */
export function showToast(message: string): void {
  const toast = { id: nextId++, message }
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
