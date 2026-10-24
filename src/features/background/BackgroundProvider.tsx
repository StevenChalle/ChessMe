import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { BackgroundContext, type Background } from './backgroundContext'
import { browserDeps } from './browserDeps'
import { useFavorites } from './favorites'
import { BackgroundRunner, type BackgroundState } from './runner'

const IDLE_STATE: BackgroundState = { phase: 'starting' }
const noop = () => () => {}

/**
 * Runs the background analysis of the favorites on every page (mounted at the root): a new
 * runner whenever the favorites change, none without any. Looks for new games when the page shows
 * again.
 */
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const favorites = useFavorites()
  const [runner, setRunner] = useState<BackgroundRunner | undefined>(undefined)
  const key = favorites ? JSON.stringify(favorites) : undefined

  useEffect(() => {
    if (!favorites) return
    const started = new BackgroundRunner(favorites, browserDeps())
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
    // A new runner only when the favorites' content changes.
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
