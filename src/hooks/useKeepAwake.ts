import { useEffect } from 'react'

/**
 * While `active` (a long analysis is running): keeps the screen on when the browser allows it
 * (Screen Wake Lock), and asks before leaving the page, since nothing is saved yet.
 */
export function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active) return
    let lock: WakeLockSentinel | undefined
    let released = false

    const acquire = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((sentinel) => {
          if (released) void sentinel.release()
          else lock = sentinel
        })
        // Refused (battery saver, unsupported, page hidden): the analysis goes on anyway.
        .catch(() => undefined)
    }
    // The browser drops the lock when the page is hidden: take it again on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      released = true
      void lock?.release()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [active])
}
