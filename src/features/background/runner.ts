import { movesHash } from '@/features/review/cache'
import type { ReviewCriteria } from '@/features/review/criteria'
import type { FoundGames, ReviewAccount } from '@/features/review/fetch'
import type { ReviewGame } from '@/features/review/games'
import { defaultSelection, type GameSelection } from '@/features/review/selection'
import { ApiError } from '@/lib/http'
import { mainAccounts, type MainProfile } from './profile'

/**
 * Keeps the main accounts' latest games fetched and analysed while the app is open, on any page
 * (docs/background-analysis.md). Gives way at once to the player's own uses of Stockfish and of
 * the platforms (lib/activity.ts): it aborts what it does, then starts again a few seconds after
 * the last one. Nothing is lost: evaluations are in the analysis cache, games in the game store.
 */

export type BackgroundPhase =
  | 'starting'
  /** Another tab does the work */
  | 'elsewhere'
  | 'syncing'
  | 'analysing'
  | 'up-to-date'
  /** The player uses Stockfish or the platforms */
  | 'busy'
  /** Paused by the player, for this session */
  | 'paused'
  | 'rate-limited'
  | 'failed'

export type BackgroundState = {
  phase: BackgroundPhase
  /** Games analysed, out of `total` */
  done?: number
  total?: number
  /** How far the batch under way is, in games (a fraction of its size): moves the bar between batches */
  current?: number
}

/** What the runner works with: injected, so that tests need neither engines nor network. */
export type BackgroundDeps = {
  find: (
    accounts: ReviewAccount[],
    selection: GameSelection,
    signal: AbortSignal,
  ) => Promise<FoundGames>
  /** The games (movesHash) already analysed with the current recipe */
  analysed: (games: ReviewGame[]) => Promise<Set<string>>
  /** `onProgress`: the share of the work done on these games, 0 to 1 */
  analyze: (
    games: ReviewGame[],
    criteria: ReviewCriteria,
    signal: AbortSignal,
    onProgress: (share: number) => void,
  ) => Promise<void>
  /** The player's saved criteria: the deep pass depends on them */
  criteria: () => ReviewCriteria
  /** An activity of the player, in this tab or another one */
  isPlayerActive: () => Promise<boolean>
  isActiveHere: () => boolean
  onActivityChange: (listener: () => void) => () => void
  /** Resolves after `ms`, or as soon as the signal aborts */
  sleep: (ms: number, signal: AbortSignal) => Promise<void>
  /** The Web Locks manager, to let a single tab work; none: this tab works */
  locks?: LockManager
}

/** Games analysed in one go: small, so that the progress moves and an abort wastes little. */
export const BATCH = 5
/** Quiet time after the player's last activity before starting again */
export const IDLE_MS = 3000
/** How often another tab's activities are checked */
export const POLL_MS = 2000
/** Up to date: looking for new games this often (and whenever the page shows again) */
export const RECHECK_MS = 10 * 60_000
/** After a 429 or a failure */
export const RETRY_MS = 60_000

const LOCK = 'craftyourchess:background'

const gameKey = (game: ReviewGame) => movesHash(game.sanMoves, game.initialFen)

/**
 * One pass: fetch the latest games (the game store only asks for new ones), then analyse those
 * not analysed yet, newest first, a few at a time. Rejects as soon as the signal aborts.
 */
export async function runCycle(
  profile: MainProfile,
  deps: BackgroundDeps,
  signal: AbortSignal,
  report: (state: BackgroundState) => void,
): Promise<{ rateLimited: boolean }> {
  report({ phase: 'syncing' })
  const accounts = mainAccounts(profile)
  const selection: GameSelection = {
    ...defaultSelection(accounts.map((account) => account.source)),
    scope: { kind: 'latest', count: profile.depth },
  }
  const found = await deps.find(accounts, selection, signal)
  signal.throwIfAborted()
  const rateLimited = found.failures.some(
    ({ error }) => error instanceof ApiError && error.status === 429,
  )
  const total = found.games.length
  // A game without moves has nothing to analyse.
  const games = found.games.filter((game) => game.sanMoves.length > 0)
  const analysed = await deps.analysed(games)
  const pending = games.filter((game) => !analysed.has(gameKey(game)))
  let done = total - pending.length
  report({ phase: 'analysing', done, total })
  for (let index = 0; index < pending.length; index += BATCH) {
    signal.throwIfAborted()
    const batch = pending.slice(index, index + BATCH)
    await deps.analyze(batch, deps.criteria(), signal, (share) =>
      report({ phase: 'analysing', done, total, current: share * batch.length }),
    )
    done += batch.length
    report({ phase: 'analysing', done, total })
  }
  return { rateLimited }
}

export class BackgroundRunner {
  private state: BackgroundState = { phase: 'starting' }
  private readonly listeners = new Set<() => void>()
  private paused = false
  /** Ends the current wait early */
  private wake: (() => void) | undefined
  /** The pass under way, aborted when the player needs the engines or pauses */
  private current: AbortController | undefined
  private stopper: AbortController | undefined
  private readonly profile: MainProfile
  private readonly deps: BackgroundDeps

  constructor(profile: MainProfile, deps: BackgroundDeps) {
    this.profile = profile
    this.deps = deps
  }

  getState = (): BackgroundState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Runs until stop(), in a single tab at a time when Web Locks exist. */
  start(): void {
    const stop = new AbortController()
    this.stopper = stop
    const { locks } = this.deps
    if (!locks) {
      void this.loop(stop.signal)
      return
    }
    this.set({ phase: 'elsewhere' })
    locks.request(LOCK, { signal: stop.signal }, () => this.loop(stop.signal)).catch(() => {})
  }

  stop(): void {
    this.stopper?.abort()
    this.current?.abort()
    this.wake?.()
  }

  pause(): void {
    this.paused = true
    this.current?.abort()
    this.set({ ...this.state, phase: 'paused' })
    this.wake?.()
  }

  resume(): void {
    this.paused = false
    this.wake?.()
  }

  /** Looks for new games now (the page shows again). */
  wakeUp(): void {
    if (this.state.phase === 'up-to-date' || this.state.phase === 'failed') this.wake?.()
  }

  private set(state: BackgroundState) {
    this.state = state
    for (const listener of this.listeners) listener()
  }

  /** Sleeps `ms` (forever if undefined), or until woken or stopped. */
  private async wait(stop: AbortSignal, ms?: number): Promise<void> {
    const woken = new AbortController()
    const onStop = () => woken.abort()
    stop.addEventListener('abort', onStop, { once: true })
    this.wake = () => woken.abort()
    try {
      if (ms === undefined) {
        await new Promise<void>((resolve) =>
          woken.signal.addEventListener('abort', () => resolve(), { once: true }),
        )
      } else {
        await this.deps.sleep(ms, woken.signal)
      }
    } finally {
      stop.removeEventListener('abort', onStop)
      this.wake = undefined
    }
  }

  /** Waits until the player has been inactive for IDLE_MS, here and in other tabs. */
  private async waitIdle(stop: AbortSignal): Promise<void> {
    let quiet = 0
    while (!stop.aborted && !this.paused && quiet < IDLE_MS) {
      await this.wait(stop, POLL_MS)
      quiet = (await this.deps.isPlayerActive()) ? 0 : quiet + POLL_MS
    }
  }

  private async loop(stop: AbortSignal): Promise<void> {
    const progress = () => ({ done: this.state.done, total: this.state.total })
    while (!stop.aborted) {
      if (this.paused) {
        this.set({ ...progress(), phase: 'paused' })
        await this.wait(stop)
        continue
      }
      if (await this.deps.isPlayerActive()) {
        this.set({ ...progress(), phase: 'busy' })
        await this.waitIdle(stop)
        continue
      }

      const run = new AbortController()
      this.current = run
      const abort = () => run.abort()
      stop.addEventListener('abort', abort, { once: true })
      const unsubscribe = this.deps.onActivityChange(() => {
        if (this.deps.isActiveHere()) run.abort()
      })
      // Other tabs' activities are only seen by asking.
      const poll = setInterval(() => {
        void this.deps.isPlayerActive().then((active) => active && run.abort())
      }, POLL_MS)
      let next: { phase: BackgroundPhase; ms: number }
      try {
        const { rateLimited } = await runCycle(this.profile, this.deps, run.signal, (state) =>
          this.set(state),
        )
        next = rateLimited
          ? { phase: 'rate-limited', ms: RETRY_MS }
          : { phase: 'up-to-date', ms: RECHECK_MS }
      } catch (error) {
        // The player needs the engines, paused, or the runner stops: the loop sees which.
        if (run.signal.aborted) continue
        console.warn('Background analysis failed', error)
        next = { phase: 'failed', ms: RETRY_MS }
      } finally {
        clearInterval(poll)
        unsubscribe()
        stop.removeEventListener('abort', abort)
        this.current = undefined
      }
      this.set({ ...progress(), phase: next.phase })
      await this.wait(stop, next.ms)
    }
  }
}
