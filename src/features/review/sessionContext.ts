import { createContext, useContext } from 'react'
import type { Mistake, ReviewOutcome } from './analyze'
import type { GameCounts } from './components/ReviewSetup'
import type { FoundGames, ReviewAccount } from './fetch'
import type { ReviewProgress } from './progress'
import type { ReviewSettings } from './settings'

/**
 * The analysis page's state, shared by its tabs (filters, analysis, training): see
 * AnalysisSessionProvider (session.tsx).
 */

export type SearchState =
  | { status: 'idle' }
  | { status: 'finding' }
  | { status: 'found'; found: FoundGames; settings: ReviewSettings }
  | { status: 'error'; error: Error }

/** `startedAt` / `endedAt` (Unix ms) drive the stopwatch, which survives tab switches. */
export type AnalysisState =
  | { status: 'none' }
  | { status: 'running'; progress: ReviewProgress; settings: ReviewSettings; startedAt: number }
  | {
      status: 'done'
      outcome: ReviewOutcome
      settings: ReviewSettings
      startedAt: number
      endedAt: number
    }
  | { status: 'error'; error: Error; settings: ReviewSettings; startedAt: number; endedAt: number }

/** `id` changes with every new session: TrainingView remounts (fresh puzzles and engine). */
export type TrainingSession = { id: number; mistakes: Mistake[]; validMaxDrop: number }

export type Session = {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
  /** The filters and options being edited */
  draft: ReviewSettings
  setDraft: (settings: ReviewSettings) => void
  search: SearchState
  analysis: AnalysisState
  training: TrainingSession | undefined
  /** The settings of the current analysis differ from the form: offer to restore them */
  draftChanged: boolean
  find: () => void
  /** Analyses the games found (asks first if an analysis exists), then shows the analysis tab */
  launch: () => Promise<void>
  /** Last game, default rules, no filters step */
  quickLast: () => Promise<void>
  /** Replays these mistakes (asks first if a training session is open) */
  train: (mistakes: Mistake[]) => Promise<void>
  restoreDraft: () => void
  /** Closes the training session (its tab goes away) and shows the results */
  endTraining: () => void
}

export const SessionContext = createContext<Session | undefined>(undefined)

export function useAnalysisSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useAnalysisSession outside AnalysisSessionProvider')
  return session
}
