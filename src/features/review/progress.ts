export type AnalysisPass = 'quick' | 'deep'

export type ReviewProgress =
  | { phase: 'fetching' }
  | { phase: 'starting-engine'; games: number }
  | {
      phase: 'analysing'
      games: number
      /** Positions of the quick pass, kept to summarize it once done */
      quickTotal: number
      /** Each pass has its own progress: its number of positions is known when it starts. */
      pass: AnalysisPass
      /** Positions evaluated in this pass */
      done: number
      total: number
      /** Time left for this pass. Undefined until the speed has been measured long enough. */
      remainingSeconds?: number
    }

/** Below this, the measured speed is too noisy to show a remaining time. */
export const MIN_MEASURE_MS = 3000

/**
 * Searches have a fixed node budget, so the speed measured since the analysis started
 * (nodes per second, all passes together) predicts the time left well, whatever the device.
 */
export function remainingSeconds({
  doneNodes,
  elapsedMs,
  remainingNodes,
}: {
  doneNodes: number
  elapsedMs: number
  remainingNodes: number
}): number | undefined {
  if (elapsedMs < MIN_MEASURE_MS || doneNodes === 0) return undefined
  return Math.max(remainingNodes, 0) / (doneNodes / elapsedMs) / 1000
}

/** The steps shown to the user while the review runs, in order. */
export const REVIEW_STEPS = ['fetch', 'quick', 'deep'] as const
export type ReviewStep = (typeof REVIEW_STEPS)[number]
export type StepStatus = 'done' | 'current' | 'upcoming'

export function currentStep(progress: ReviewProgress): ReviewStep {
  if (progress.phase === 'fetching') return 'fetch'
  // Starting the engines takes a moment: shown as the beginning of the quick pass.
  if (progress.phase === 'starting-engine') return 'quick'
  return progress.pass
}

export function stepStatus(step: ReviewStep, progress: ReviewProgress): StepStatus {
  const current = REVIEW_STEPS.indexOf(currentStep(progress))
  const index = REVIEW_STEPS.indexOf(step)
  return index < current ? 'done' : index === current ? 'current' : 'upcoming'
}
