import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { movesHash } from '@/features/review/cache'
import { DEFAULT_CRITERIA } from '@/features/review/criteria'
import type { ReviewGame } from '@/features/review/games'
import { ApiError } from '@/lib/http'
import type { MainProfile } from './profile'
import {
  BackgroundRunner,
  IDLE_MS,
  POLL_MS,
  RECHECK_MS,
  runCycle,
  type BackgroundDeps,
  type BackgroundState,
} from './runner'

const profile: MainProfile = { lichess: 'alice', depth: 50 }

const game = (id: string) =>
  ({ source: 'lichess', id, sanMoves: ['e4', id], playedAt: new Date(0) }) as unknown as ReviewGame

/** Twelve games, the first three already analysed */
const games = Array.from({ length: 12 }, (_, index) => game(`m${index}`))

let active: boolean
let listeners: Set<() => void>
let analysed: string[][]
/** How long one batch takes */
let batchMs: number

function deps(overrides: Partial<BackgroundDeps> = {}): BackgroundDeps {
  return {
    find: async () => ({ games, failures: [] }),
    // The first three, and those analysed since (the analysis cache keeps them).
    analysed: async () =>
      new Set(
        [...games.slice(0, 3).map((g) => g.id), ...analysed.flat()].map((id) =>
          movesHash(['e4', id]),
        ),
      ),
    analyze: (batch, _criteria, signal) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          analysed.push(batch.map((g) => g.id))
          resolve()
        }, batchMs)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(signal.reason)
        })
      }),
    criteria: () => DEFAULT_CRITERIA,
    isPlayerActive: async () => active,
    isActiveHere: () => active,
    onActivityChange: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    sleep: (ms, signal) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          resolve()
        })
      }),
    ...overrides,
  }
}

const setActive = (value: boolean) => {
  active = value
  for (const listener of listeners) listener()
}

beforeEach(() => {
  vi.useFakeTimers()
  active = false
  listeners = new Set()
  analysed = []
  batchMs = 1000
})

afterEach(() => vi.useRealTimers())

describe('runCycle', () => {
  it('analyses the games not analysed yet, newest first, a few at a time', async () => {
    const states: BackgroundState[] = []
    const cycle = runCycle(profile, deps(), new AbortController().signal, (state) =>
      states.push(state),
    )
    await vi.runAllTimersAsync()
    expect(await cycle).toEqual({ rateLimited: false })
    expect(analysed).toEqual([
      ['m3', 'm4', 'm5', 'm6', 'm7'],
      ['m8', 'm9', 'm10', 'm11'],
    ])
    expect(
      states
        .filter((state) => state.current === undefined)
        .map(({ phase, done }) => `${phase}:${done ?? ''}`),
    ).toEqual(['syncing:', 'analysing:3', 'analysing:8', 'analysing:12'])
  })

  it('asks for the latest games of every main account, all platforms together', async () => {
    const find = vi.fn<BackgroundDeps['find']>(async () => ({ games: [], failures: [] }))
    await runCycle(
      { lichess: 'alice', chesscom: 'bob', depth: 200 },
      deps({ find }),
      new AbortController().signal,
      () => {},
    )
    const [accounts, selection] = find.mock.calls[0]!
    expect(accounts.map((account) => account.source)).toEqual(['lichess', 'chesscom'])
    expect(selection.scope).toEqual({ kind: 'latest', count: 200 })
  })

  it('says when Lichess limits the requests', async () => {
    const find = async () => ({
      games: [],
      failures: [{ source: 'lichess' as const, error: new ApiError('lichess', 429, 'Too many') }],
    })
    expect(await runCycle(profile, deps({ find }), new AbortController().signal, () => {})).toEqual(
      { rateLimited: true },
    )
  })
})

describe('BackgroundRunner', () => {
  it('gives way to the player at once, then starts again once they are done', async () => {
    const runner = new BackgroundRunner(profile, deps())
    runner.start()
    await vi.advanceTimersByTimeAsync(batchMs + 10)
    expect(analysed).toHaveLength(1)

    setActive(true)
    await vi.advanceTimersByTimeAsync(10)
    expect(runner.getState().phase).toBe('busy')
    await vi.advanceTimersByTimeAsync(5 * batchMs)
    expect(analysed).toHaveLength(1)

    setActive(false)
    await vi.advanceTimersByTimeAsync(IDLE_MS + POLL_MS + batchMs + 10)
    expect(analysed).toHaveLength(2)
    expect(runner.getState()).toMatchObject({ phase: 'up-to-date', done: 12, total: 12 })
    runner.stop()
  })

  it('pauses and resumes when the player asks', async () => {
    const runner = new BackgroundRunner(profile, deps())
    runner.start()
    await vi.advanceTimersByTimeAsync(10)
    runner.pause()
    await vi.advanceTimersByTimeAsync(10 * batchMs)
    expect(analysed).toEqual([])
    expect(runner.getState().phase).toBe('paused')
    runner.resume()
    await vi.advanceTimersByTimeAsync(3 * batchMs)
    expect(analysed).toHaveLength(2)
    runner.stop()
  })

  it('looks for new games again later', async () => {
    const find = vi.fn<BackgroundDeps['find']>(async () => ({ games: [], failures: [] }))
    const runner = new BackgroundRunner(profile, deps({ find }))
    runner.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(find).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(RECHECK_MS)
    expect(find).toHaveBeenCalledTimes(2)
    runner.wakeUp()
    await vi.advanceTimersByTimeAsync(10)
    expect(find).toHaveBeenCalledTimes(3)
    runner.stop()
  })
})
