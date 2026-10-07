import { useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PlayerUsernames } from '@/features/player/search'
import { useConfirm } from '@/hooks/useConfirm'
import { useKeepAwake } from '@/hooks/useKeepAwake'
import { ActiveTime, trackActiveTime } from '@/lib/activeTime'
import { trainingPuzzles } from '@/features/training/order'
import {
  DEFAULT_TRAINING_SETTINGS,
  saveTrainingSettings,
  toTrainingOptions,
  type TrainingSettings,
} from '@/features/training/settings'
import { m } from '@/paraglide/messages'
import { analyzeGames, type Mistake } from './analyze'
import { DEFAULT_CRITERIA } from './criteria'
import { findGames, type FoundGames, type ReviewAccount } from './fetch'
import { defaultSelection } from './selection'
import {
  loadReviewSettings,
  sameSelection,
  saveReviewSettings,
  type ReviewSettings,
} from './settings'
import {
  SessionContext,
  type AnalysisState,
  type SearchState,
  type Session,
  type TrainingTab,
} from './sessionContext'

/** The quick review: the last game, default rules. */
function quickSettings(accounts: ReviewAccount[]): ReviewSettings {
  return {
    selection: {
      ...defaultSelection(accounts.map((account) => account.source)),
      scope: { kind: 'latest', count: 1 },
    },
    criteria: DEFAULT_CRITERIA,
  }
}

/**
 * Holds the analysis page's state, shared by its tabs (filters, analysis, training) so switching
 * tabs loses nothing. A search, an analysis and a training session are independent: the user can
 * look for other games while an analysis runs. Leaving the page drops everything (nothing is
 * saved). `start="last"` starts the quick review right away.
 */
export function AnalysisSessionProvider({
  accounts,
  gameTotal,
  usernames,
  start,
  children,
}: {
  accounts: ReviewAccount[]
  /** Games played on all the accounts, an indication */
  gameTotal: number
  /** The accounts in the URL, kept when switching tabs */
  usernames: PlayerUsernames
  start?: 'last'
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  const sources = useMemo(() => accounts.map((account) => account.source), [accounts])
  // The quick review is "running" from the first render, so the analysis tab never thinks there
  // is nothing to show (children's effects run before ours).
  const [initialQuick] = useState(() => (start === 'last' ? quickSettings(accounts) : undefined))
  const [draft, setDraftState] = useState<ReviewSettings>(
    () => initialQuick ?? loadReviewSettings(sources),
  )
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })
  const [analysis, setAnalysis] = useState<AnalysisState>(() =>
    initialQuick
      ? {
          status: 'running',
          progress: { phase: 'fetching' },
          settings: initialQuick,
          // Replaced by the review's own clock as soon as it starts.
          clock: new ActiveTime(),
        }
      : { status: 'none' },
  )
  const [trainings, setTrainings] = useState<TrainingTab[]>([])
  const [analysisId, setAnalysisId] = useState(0)
  const searchJob = useRef<AbortController | undefined>(undefined)
  const analysisJob = useRef<AbortController | undefined>(undefined)
  const analysisCount = useRef(0)
  /** Training tabs opened on this page: their numbers are never reused */
  const trainingCount = useRef(0)
  /** Training restarts, to remount the board each time */
  const runCount = useRef(0)
  const router = useRouter()

  useKeepAwake(analysis.status === 'running')

  /** Stops the latest search and analysis, whichever they are by then. */
  const stopAll = () => {
    searchJob.current?.abort()
    analysisJob.current?.abort()
  }

  const restart = (job: React.RefObject<AbortController | undefined>) => {
    job.current?.abort()
    job.current = new AbortController()
    return job.current.signal
  }

  /**
   * Runs an analysis, fetching the games first, and replaces any other. Trainings already
   * launched stay, with their own errors (from an older analysis now); those still on their
   * options depended on the replaced one and close.
   */
  const runAnalysis = useCallback(
    async (settings: ReviewSettings, getFound: (signal: AbortSignal) => Promise<FoundGames>) => {
      const signal = restart(analysisJob)
      analysisCount.current += 1
      setAnalysisId(analysisCount.current)
      setTrainings((tabs) => tabs.filter((tab) => tab.phase.kind === 'running'))
      const active = trackActiveTime()
      const clock = active.time
      setAnalysis({ status: 'running', progress: { phase: 'fetching' }, settings, clock })
      try {
        const found = await getFound(signal)
        if (signal.aborted) return
        const games =
          found.games.length === 0
            ? []
            : await analyzeGames(found.games, settings.criteria, {
                signal,
                onProgress: (progress) => {
                  clock.markProgress()
                  if (!signal.aborted) {
                    setAnalysis({ status: 'running', progress, settings, clock })
                  }
                },
              })
        if (!signal.aborted) {
          setAnalysis({
            status: 'done',
            outcome: { games, failures: found.failures, criteria: settings.criteria },
            settings,
            durationMs: clock.elapsedMs(),
          })
        }
      } catch (error) {
        if (!signal.aborted) {
          setAnalysis({
            status: 'error',
            error: error as Error,
            settings,
            durationMs: clock.elapsedMs(),
          })
        }
      } finally {
        active.stop()
      }
    },
    [],
  )

  // Starts the quick review (if asked) and stops everything when the page goes away. In
  // StrictMode the effect runs twice: the first quick review is aborted, the second one runs.
  useEffect(() => {
    if (initialQuick) {
      void runAnalysis(initialQuick, (signal) =>
        findGames(accounts, initialQuick.selection, { signal }),
      )
      // Reloading the page later should not start it again.
      void navigate({ to: '.', search: usernames, replace: true })
    }
    return stopAll
    // Once per page: the provider is remounted for other accounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Every edit makes the games found stale: the filters tab
   * searches again (rules only change the estimate, not the games).
   */
  const setDraft = useCallback(
    (settings: ReviewSettings) => {
      setDraftState(settings)
      if (search.status === 'finding') {
        searchJob.current?.abort()
        setSearch({ status: 'idle' })
      } else if (
        search.status === 'error' ||
        (search.status === 'found' && !sameSelection(search.selection, settings.selection))
      ) {
        setSearch({ status: 'idle' })
      }
    },
    [search],
  )

  const find = useCallback(() => {
    const { selection } = draft
    const signal = restart(searchJob)
    setSearch({ status: 'finding' })
    findGames(accounts, selection, { signal }).then(
      (found) => {
        if (!signal.aborted) setSearch({ status: 'found', found, selection })
      },
      (error: Error) => {
        if (!signal.aborted) setSearch({ status: 'error', error })
      },
    )
  }, [accounts, draft])

  /** Starting a new analysis replaces the current one, and the training built on it. */
  const confirmReplace = useCallback(async () => {
    if (analysis.status === 'none') return true
    return confirm({
      title: m.confirm_replace_title(),
      description: m.confirm_replace_body(),
      confirmLabel: m.confirm_replace_action(),
      cancelLabel: m.confirm_cancel(),
    })
  }, [analysis.status, confirm])

  // Like the tabs, keeps the scroll position: the training tab places its board itself.
  const goTo = useCallback(
    (to: '/analysis/run') => void navigate({ to, search: usernames, resetScroll: false }),
    [navigate, usernames],
  )

  const launch = useCallback(async () => {
    if (search.status !== 'found' || !(await confirmReplace())) return
    const { found, selection } = search
    const settings = { selection, criteria: draft.criteria }
    // Remembered for next time: the settings of the last analysis launched from the filters.
    saveReviewSettings(settings)
    void runAnalysis(settings, async () => found)
    goTo('/analysis/run')
  }, [search, draft.criteria, confirmReplace, runAnalysis, goTo])

  const showTraining = useCallback(
    (number: number) =>
      void navigate({
        to: '/analysis/training/$number',
        params: { number: String(number) },
        search: usernames,
        resetScroll: false,
      }),
    [navigate, usernames],
  )

  /** A new tab on the errors of the current analysis, on its options or already running. */
  const openTraining = useCallback(
    (mistakes: Mistake[], running: boolean) => {
      if (analysis.status !== 'done') return
      // Numbers are never reused while trainings are open; with none left, they start over.
      if (trainings.length === 0) trainingCount.current = 0
      trainingCount.current += 1
      runCount.current += 1
      const { criteria } = analysis.outcome
      const tab: TrainingTab = {
        number: trainingCount.current,
        analysisId,
        mistakes,
        validMaxDrop: criteria.validMaxDrop,
        errorMinDrop: criteria.errorMinDrop,
        phase: running
          ? {
              kind: 'running',
              settings: DEFAULT_TRAINING_SETTINGS,
              puzzles: trainingPuzzles(
                mistakes,
                toTrainingOptions(DEFAULT_TRAINING_SETTINGS, criteria.errorMinDrop),
              ),
              run: runCount.current,
            }
          : { kind: 'options' },
        finished: false,
      }
      setTrainings((tabs) => [...tabs, tab])
      showTraining(tab.number)
    },
    [analysis, analysisId, trainings.length, showTraining],
  )

  const newTraining = useCallback(() => {
    if (analysis.status !== 'done') return
    openTraining(
      analysis.outcome.games.flatMap((game) => game.mistakes),
      false,
    )
  }, [analysis, openTraining])

  const trainGame = useCallback(
    (mistakes: Mistake[]) => openTraining(mistakes, true),
    [openTraining],
  )

  const updateTraining = useCallback(
    (number: number, change: (tab: TrainingTab) => TrainingTab) =>
      setTrainings((tabs) => tabs.map((tab) => (tab.number === number ? change(tab) : tab))),
    [],
  )

  const launchTraining = useCallback(
    (number: number, settings: TrainingSettings) => {
      saveTrainingSettings(settings)
      runCount.current += 1
      const run = runCount.current
      updateTraining(number, (tab) => ({
        ...tab,
        phase: {
          kind: 'running',
          settings,
          puzzles: trainingPuzzles(tab.mistakes, toTrainingOptions(settings, tab.errorMinDrop)),
          run,
        },
        finished: false,
      }))
    },
    [updateTraining],
  )

  const restartTraining = useCallback(
    (number: number) => {
      runCount.current += 1
      const run = runCount.current
      updateTraining(number, (tab) =>
        tab.phase.kind === 'running'
          ? {
              ...tab,
              phase: {
                ...tab.phase,
                puzzles: trainingPuzzles(
                  tab.mistakes,
                  toTrainingOptions(tab.phase.settings, tab.errorMinDrop),
                ),
                run,
              },
              finished: false,
            }
          : tab,
      )
    },
    [updateTraining],
  )

  const setTrainingFinished = useCallback((number: number, finished: boolean) => {
    setTrainings((tabs) =>
      tabs.some((tab) => tab.number === number && tab.finished !== finished)
        ? tabs.map((tab) => (tab.number === number ? { ...tab, finished } : tab))
        : tabs,
    )
  }, [])

  const showResults = useCallback(() => goTo('/analysis/run'), [goTo])

  /** Closing the tab on screen shows its neighbor, else the results (or the filters). */
  const closeTraining = useCallback(
    async (number: number) => {
      const index = trainings.findIndex((tab) => tab.number === number)
      const tab = trainings[index]
      if (!tab) return
      // Only a training under way has something to lose (not its options, nor once finished).
      if (
        tab.phase.kind === 'running' &&
        !tab.finished &&
        !(await confirm({
          title: m.confirm_close_training_title(),
          description: m.confirm_close_training_body(),
          confirmLabel: m.confirm_close_training_action(),
          cancelLabel: m.confirm_cancel(),
        }))
      ) {
        return
      }
      // Leave the tab first: without its training, it would redirect elsewhere.
      const shown = router.state.location.pathname === `/analysis/training/${number}`
      const neighbor = trainings[index + 1] ?? trainings[index - 1]
      const leave = !shown
        ? Promise.resolve()
        : neighbor
          ? navigate({
              to: '/analysis/training/$number',
              params: { number: String(neighbor.number) },
              search: usernames,
              resetScroll: false,
            })
          : navigate({
              to: analysis.status === 'none' ? '/analysis' : '/analysis/run',
              search: usernames,
              resetScroll: false,
            })
      void leave.then(() => setTrainings((tabs) => tabs.filter((item) => item.number !== number)))
    },
    [trainings, confirm, router, analysis.status, navigate, usernames],
  )

  const analysisSettings = analysis.status === 'none' ? undefined : analysis.settings

  const value: Session = {
    accounts,
    gameTotal,
    draft,
    setDraft,
    search,
    analysis,
    analysisId,
    trainings,
    analysisSettings,
    find,
    launch,
    newTraining,
    trainGame,
    launchTraining,
    restartTraining,
    closeTraining,
    setTrainingFinished,
    showResults,
  }

  return (
    <SessionContext value={value}>
      {children}
      {dialog}
    </SessionContext>
  )
}
