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

export function registerServiceWorker(): void {
  const openedAt = Date.now()
  const apply = () => {
    void updateSW(true)
    setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
  }
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (Date.now() - openedAt < APPLY_AT_LAUNCH_MS) apply()
      else setAppUpdateAvailable(apply)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
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
