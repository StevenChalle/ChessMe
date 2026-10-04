import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeGames, type ReviewOutcome } from './analyze'
import type { ReviewCriteria } from './criteria'
import { findGames, type FoundGames, type ReviewAccount } from './fetch'
import type { ReviewProgress } from './progress'
import type { GameSelection } from './selection'

export type ReviewState =
  | { status: 'setup' }
  | { status: 'finding' }
  /** Games found, waiting for the user to launch the analysis (advanced review) */
  | { status: 'found'; found: FoundGames; criteria: ReviewCriteria }
  | { status: 'running'; progress: ReviewProgress }
  | { status: 'done'; outcome: ReviewOutcome }
  | { status: 'error'; error: Error }

/**
 * The review, step by step: find the games, then analyse them. The quick review chains both;
 * the advanced one stops in between to show the recap. Unmounting (closing the dialog) aborts
 * everything, requests and engines. Nothing is cached: every run starts from scratch.
 * Not TanStack Query: long, cancellable jobs with progress, and no data worth keeping.
 */
export function useGameReview(initial: ReviewState = { status: 'setup' }) {
  const [state, setState] = useState<ReviewState>(initial)
  const controller = useRef<AbortController | undefined>(undefined)

  /** Cancels the running job and gives a fresh signal for the next one. */
  const restart = useCallback(() => {
    controller.current?.abort()
    controller.current = new AbortController()
    return controller.current.signal
  }, [])

  useEffect(() => () => controller.current?.abort(), [])

  const fail = useCallback((signal: AbortSignal, error: Error) => {
    if (!signal.aborted) setState({ status: 'error', error })
  }, [])

  const analyze = useCallback(
    async (found: FoundGames, criteria: ReviewCriteria) => {
      const signal = restart()
      setState({
        status: 'running',
        progress: { phase: 'starting-engine', games: found.games.length },
      })
      try {
        const games = await analyzeGames(found.games, criteria, {
          signal,
          onProgress: (progress) => {
            if (!signal.aborted) setState({ status: 'running', progress })
          },
        })
        if (!signal.aborted) {
          setState({ status: 'done', outcome: { games, failures: found.failures, criteria } })
        }
      } catch (error) {
        fail(signal, error as Error)
      }
    },
    [restart, fail],
  )

  const find = useCallback(
    async (
      accounts: ReviewAccount[],
      selection: GameSelection,
      criteria: ReviewCriteria,
      { thenAnalyze = false }: { thenAnalyze?: boolean } = {},
    ) => {
      const signal = restart()
      setState(
        thenAnalyze
          ? { status: 'running', progress: { phase: 'fetching' } }
          : { status: 'finding' },
      )
      try {
        const found = await findGames(accounts, selection, { signal })
        if (signal.aborted) return
        if (!thenAnalyze) {
          // The recap shows the games found (or why there are none) before launching.
          setState({ status: 'found', found, criteria })
        } else if (found.games.length === 0) {
          setState({ status: 'done', outcome: { games: [], failures: found.failures, criteria } })
        } else {
          await analyze(found, criteria)
        }
      } catch (error) {
        fail(signal, error as Error)
      }
    },
    [restart, analyze, fail],
  )

  const backToSetup = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'setup' })
  }, [])

  return { state, find, analyze, backToSetup }
}
