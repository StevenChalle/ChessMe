import type { ActiveTime } from '@/lib/activeTime'
import { createContext, useContext } from 'react'
import type { Mistake, ReviewOutcome } from './analyze'
import type { FoundGames, ReviewAccount } from './fetch'
import type { ReviewProgress } from './progress'
import type { GameSelection } from './selection'
import type { ReviewSettings } from './settings'

/**
 * The analysis page's state, shared by its tabs (filters, analysis, training): see
 * AnalysisSessionProvider (session.tsx).
 */

export type SearchState =
  | { status: 'idle' }
  | { status: 'finding' }
  | { status: 'found'; found: FoundGames; selection: GameSelection }
  | { status: 'error'; error: Error }

/**
 * The stopwatch survives tab switches: `clock` while running, then the final `durationMs`. Both
 * leave out the time the page was hidden (a phone pauses the analysis then, see ActiveTime).
 */
export type AnalysisState =
  | { status: 'none' }
  | { status: 'running'; progress: ReviewProgress; settings: ReviewSettings; clock: ActiveTime }
  | { status: 'done'; outcome: ReviewOutcome; settings: ReviewSettings; durationMs: number }
  | { status: 'error'; error: Error; settings: ReviewSettings; durationMs: number }

/** `id` changes with every new session: TrainingView remounts (fresh puzzles and engine). */
export type TrainingSession = { id: number; mistakes: Mistake[]; validMaxDrop: number }

export type Session = {
  accounts: ReviewAccount[]
  /** Games played on all the accounts, an indication */
  gameTotal: number
  /** The filters and options being edited */
  draft: ReviewSettings
  setDraft: (settings: ReviewSettings) => void
  search: SearchState
  analysis: AnalysisState
  training: TrainingSession | undefined
  /** The settings of the current analysis, which each section of the form can go back to */
  analysisSettings: ReviewSettings | undefined
  /** Looks for the games of the filters being edited (the filters tab calls it on every change) */
  find: () => void
  /** Analyses the games found, with the rules being edited (asks first if an analysis exists), then shows the analysis tab */
  launch: () => Promise<void>
  /** Replays these mistakes (asks first if a training session is open) */
  train: (mistakes: Mistake[]) => Promise<void>
  /** Closes the training session (its tab goes away) and shows the results */
  endTraining: () => void
}

export const SessionContext = createContext<Session | undefined>(undefined)

export function useAnalysisSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useAnalysisSession outside AnalysisSessionProvider')
  return session
}
