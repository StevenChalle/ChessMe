/**
 * Whether a new version of the app is ready, and how to switch to it. Kept apart from the
 * service worker registration (virtual:pwa-register, see registerServiceWorker.ts) so that
 * components can read it anywhere, tests included.
 */

type Listener = () => void

let available = false
let apply: (() => void) | undefined
const listeners = new Set<Listener>()

export function subscribeAppUpdate(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isAppUpdateAvailable(): boolean {
  return available
}

/** Called by the registration once a new version is installed and waiting. */
export function setAppUpdateAvailable(applyUpdate: () => void): void {
  available = true
  apply = applyUpdate
  for (const listener of listeners) listener()
}

/** Activates the new version and reloads the page. */
export function applyAppUpdate(): void {
  apply?.()
}
