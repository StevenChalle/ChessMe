import { useEffect, useState } from 'react'
import { reviewRecentGames, type ReviewAccount, type ReviewOutcome } from './analyze'
import type { ReviewProgress } from './progress'

export type ReviewState =
  | { status: 'running'; progress: ReviewProgress }
  | { status: 'done'; outcome: ReviewOutcome }
  | { status: 'error'; error: Error }

/**
 * Runs the review while the component is mounted: unmounting (closing the dialog) aborts it,
 * stopping the requests and the engines. Nothing is cached: every run starts from scratch.
 * Not TanStack Query: a long, cancellable job with progress, and no data worth keeping.
 */
export function useGameReview(accounts: ReviewAccount[]): ReviewState {
  const [state, setState] = useState<ReviewState>({
    status: 'running',
    progress: { phase: 'fetching' },
  })
  const key = JSON.stringify(accounts)

  useEffect(() => {
    const controller = new AbortController()
    const accounts = JSON.parse(key) as ReviewAccount[]
    reviewRecentGames(accounts, {
      signal: controller.signal,
      onProgress: (progress) => {
        if (!controller.signal.aborted) setState({ status: 'running', progress })
      },
    }).then(
      (outcome) => {
        if (!controller.signal.aborted) setState({ status: 'done', outcome })
      },
      (error: Error) => {
        if (!controller.signal.aborted) setState({ status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [key])

  return state
}
