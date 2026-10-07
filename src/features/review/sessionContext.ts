import type { ActiveTime } from '@/lib/activeTime'
import { createContext, useContext } from 'react'
import type { Mistake, ReviewOutcome } from './analyze'
import type { FoundGames, ReviewAccount } from './fetch'
import type { ReviewProgress } from './progress'
import type { GameSelection } from './selection'
import type { ReviewSettings } from './settings'
import type { TrainingSettings } from '@/features/training/settings'

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

/**
 * A training tab: first its options, then the board. `run` changes with every restart, which
 * remounts TrainingView (fresh draw and engine).
 */
export type TrainingPhase =
  | { kind: 'options' }
  | { kind: 'running'; puzzles: Mistake[]; settings: TrainingSettings; run: number }

export type TrainingTab = {
  /** Fixed for the tab's life, never reused on the page: its title and route */
  number: number
  /** The analysis its errors come from: an older one once another analysis is launched */
  analysisId: number
  /** The errors it can replay, kept even when another analysis replaces them */
  mistakes: Mistake[]
  /** The analysis's rules: valid moves when replaying, and the lowest error */
  validMaxDrop: number
  errorMinDrop: number
  phase: TrainingPhase
  /** Every position has been played: closing it asks nothing */
  finished: boolean
}

export type Session = {
  accounts: ReviewAccount[]
  /** Games played on all the accounts, an indication */
  gameTotal: number
  /** The filters and options being edited */
  draft: ReviewSettings
  setDraft: (settings: ReviewSettings) => void
  search: SearchState
  analysis: AnalysisState
  /** Increases with every analysis launched: trainings from an older one are told apart */
  analysisId: number
  trainings: TrainingTab[]
  /** The settings of the current analysis, which each section of the form can go back to */
  analysisSettings: ReviewSettings | undefined
  /** Looks for the games of the filters being edited (the filters tab calls it on every change) */
  find: () => void
  /** Analyses the games found, with the rules being edited (asks first if an analysis exists), then shows the analysis tab */
  launch: () => Promise<void>
  /** Opens a training tab on its options, for the errors of the current analysis */
  newTraining: () => void
  /** Opens a training tab replaying these errors right away, with the default options */
  trainGame: (mistakes: Mistake[]) => void
  /** Starts the training of a tab with these options, remembered for next time */
  launchTraining: (number: number, settings: TrainingSettings) => void
  /** The same training again, in a new draw */
  restartTraining: (number: number) => void
  /** Closes a training tab (asks first unless every position has been played) */
  closeTraining: (number: number) => Promise<void>
  setTrainingFinished: (number: number, finished: boolean) => void
  /** Back to the analysis results */
  showResults: () => void
}

export const SessionContext = createContext<Session | undefined>(undefined)

export function useAnalysisSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useAnalysisSession outside AnalysisSessionProvider')
  return session
}
