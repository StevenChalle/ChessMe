import { gameStore } from '@/features/games/store'
import { analyzeGames, RECIPE } from '@/features/review/analyze'
import { analysedGames, movesHash } from '@/features/review/cache'
import { BACKGROUND_FETCHERS, findGames } from '@/features/review/fetch'
import { loadReviewSettings } from '@/features/review/settings'
import { isActiveHere, isPlayerActive, onActivityChange } from '@/lib/activity'
import type { BackgroundDeps, Heartbeat, TabChannel } from './runner'

/** The background analysis in the browser: the game store, the analysis cache, real engines. */
export function browserDeps(): BackgroundDeps {
  return {
    find: (accounts, selection, signal) =>
      findGames(accounts, selection, { signal, store: gameStore, fetchers: BACKGROUND_FETCHERS }),
    analysed: (games) =>
      analysedGames(
        games.map((game) => movesHash(game.sanMoves, game.initialFen)),
        RECIPE,
      ),
    analyze: async (games, criteria, signal, onProgress) => {
      await analyzeGames(games, criteria, {
        signal,
        // The deep pass is about as long as the quick one, though on far fewer positions.
        onProgress: (progress) => {
          if (progress.phase !== 'analysing' || progress.total === 0) return
          const share = progress.done / progress.total
          onProgress(progress.pass === 'quick' ? share / 2 : 0.5 + share / 2)
        },
      })
    },
    criteria: () => loadReviewSettings(['lichess', 'chesscom']).criteria,
    isPlayerActive,
    isActiveHere,
    onActivityChange,
    sleep: (ms, signal) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            resolve()
          },
          { once: true },
        )
      }),
    locks: typeof navigator === 'undefined' ? undefined : navigator.locks,
    channel: tabChannel(),
    isVisible: () => document.visibilityState === 'visible',
    now: Date.now,
  }
}

/** The working tab's heartbeat, between the app's tabs (nothing stored). */
function tabChannel(): TabChannel | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined
  const channel = new BroadcastChannel('craftyourchess:background')
  return {
    post: (heartbeat) => channel.postMessage(heartbeat),
    listen: (listener) => {
      const onMessage = (event: MessageEvent<Heartbeat>) => listener(event.data)
      channel.addEventListener('message', onMessage)
      return () => channel.removeEventListener('message', onMessage)
    },
  }
}
