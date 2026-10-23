/**
 * The player's own uses of Stockfish (an analysis, a deepening, a training's engine) and of the
 * platforms' game downloads. The background analysis gives way to them at once
 * (docs/background-analysis.md): it watches this tab through the listeners, and other tabs through
 * a shared Web Lock each activity holds, released by the browser if its tab closes.
 */

const FOREGROUND_LOCK = 'craftyourchess:foreground'

let active = 0
const listeners = new Set<() => void>()

const lockManager = (): LockManager | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.locks

function notify() {
  for (const listener of listeners) listener()
}

/** Starts an activity of the player; call the returned function when it is over (once is enough). */
export function beginActivity(): () => void {
  active++
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  lockManager()
    ?.request(FOREGROUND_LOCK, { mode: 'shared' }, () => held)
    .catch(() => {})
  notify()
  let ended = false
  return () => {
    if (ended) return
    ended = true
    active--
    release()
    notify()
  }
}

/** Runs `task` as an activity of the player. */
export async function withActivity<T>(task: () => Promise<T>): Promise<T> {
  const end = beginActivity()
  try {
    return await task()
  } finally {
    end()
  }
}

/** An activity of the player under way in this tab. */
export function isActiveHere(): boolean {
  return active > 0
}

/** An activity of the player under way in this tab or another one. */
export async function isPlayerActive(): Promise<boolean> {
  if (active > 0) return true
  try {
    const state = await lockManager()?.query()
    return state?.held?.some((lock) => lock.name === FOREGROUND_LOCK) ?? false
  } catch {
    return false
  }
}

/** Called whenever an activity starts or ends in this tab. */
export function onActivityChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
