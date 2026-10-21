import { registerSW } from 'virtual:pwa-register'
import { setAppUpdateAvailable } from './appUpdate'

/**
 * A new version found this soon after the app opened is applied at once (reload): nothing has
 * been started yet. Later, a banner offers it instead, so a running review is never lost.
 */
const APPLY_AT_LAUNCH_MS = 10_000
const CHECK_EVERY_MS = 60 * 60_000

/**
 * updateSW(true) reloads once the new worker takes control; a page it never controlled (first
 * visit) gets no such event, hence a plain reload shortly after if nothing happened.
 */
const RELOAD_FALLBACK_MS = 2_000

/**
 * The engine files' cache used to be "engine", with a rule that also caught app modules in dev
 * (/src/lib/engine/*.ts), served stale from then on. Its replacement has another name: drop it.
 */
const OBSOLETE_CACHES = ['engine']

export function registerServiceWorker(): void {
  if ('caches' in window) {
    for (const name of OBSOLETE_CACHES) void caches.delete(name)
  }
  const openedAt = Date.now()
  let found = false
  const apply = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    })
    void updateSW(true)
    setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
  }
  /** A new version is installed and waiting, however it was noticed. */
  const onWaiting = () => {
    if (found) return
    found = true
    if (Date.now() - openedAt < APPLY_AT_LAUNCH_MS) apply()
    else setAppUpdateAvailable(apply)
  }
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: onWaiting,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // workbox-window misses an update the browser was already installing when register()
      // resolved (Firefox and Safari don't wait for it): no prompt, the new version stayed
      // waiting until every tab was closed. Watch the registration directly as well.
      const isUpdate = () => registration.waiting && navigator.serviceWorker.controller
      const watchInstalling = () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && isUpdate()) onWaiting()
        })
      }
      if (isUpdate()) onWaiting()
      watchInstalling()
      registration.addEventListener('updatefound', watchInstalling)
      const check = () => {
        if (navigator.onLine) void registration.update()
      }
      // An installed app is often resumed rather than reloaded: check when it comes back too.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, CHECK_EVERY_MS)
    },
  })
}
