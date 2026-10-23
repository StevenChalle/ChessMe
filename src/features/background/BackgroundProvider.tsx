import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { BackgroundContext, type Background } from './backgroundContext'
import { browserDeps } from './browserDeps'
import { useMainProfile } from './profile'
import { BackgroundRunner, type BackgroundState } from './runner'

const IDLE_STATE: BackgroundState = { phase: 'starting' }
const noop = () => () => {}

/**
 * Runs the background analysis of the main accounts on every page (mounted at the root): a new
 * runner whenever the profile changes, none without one. Looks for new games when the page shows
 * again.
 */
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const profile = useMainProfile()
  const [runner, setRunner] = useState<BackgroundRunner | undefined>(undefined)
  const key = profile ? JSON.stringify(profile) : undefined

  useEffect(() => {
    if (!profile) return
    const started = new BackgroundRunner(profile, browserDeps())
    started.start()
    setRunner(started)
    const onVisible = () => {
      if (document.visibilityState === 'visible') started.wakeUp()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      started.stop()
      setRunner(undefined)
    }
    // A new runner only when the profile's content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const state = useSyncExternalStore(
    runner?.subscribe ?? noop,
    runner?.getState ?? (() => IDLE_STATE),
  )
  const value: Background | undefined = runner && {
    state,
    pause: () => runner.pause(),
    resume: () => runner.resume(),
  }

  return <BackgroundContext value={value}>{children}</BackgroundContext>
}
