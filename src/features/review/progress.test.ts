import { describe, expect, it } from 'vitest'
import { MIN_MEASURE_MS, remainingSeconds, stepStatus, type ReviewProgress } from './progress'

describe('remainingSeconds', () => {
  it('waits for a reliable speed', () => {
    expect(
      remainingSeconds({ doneNodes: 25, elapsedMs: MIN_MEASURE_MS - 1, remainingNodes: 75 }),
    ).toBeUndefined()
    expect(
      remainingSeconds({ doneNodes: 0, elapsedMs: 10_000, remainingNodes: 75 }),
    ).toBeUndefined()
  })

  it('extrapolates the measured speed', () => {
    // 1 000 nodes in 4 s, 3 000 left: 12 s
    expect(remainingSeconds({ doneNodes: 1000, elapsedMs: 4000, remainingNodes: 3000 })).toBe(12)
  })

  it('never goes negative', () => {
    expect(remainingSeconds({ doneNodes: 1000, elapsedMs: 4000, remainingNodes: -5 })).toBe(0)
  })
})

describe('stepStatus', () => {
  const deep: ReviewProgress = {
    phase: 'analysing',
    games: 10,
    quickTotal: 900,
    pass: 'deep',
    done: 3,
    total: 70,
  }

  it('marks the steps before, at and after the current one', () => {
    expect(stepStatus('fetch', { phase: 'fetching' })).toBe('current')
    expect(stepStatus('quick', { phase: 'fetching' })).toBe('upcoming')
    expect(stepStatus('fetch', { phase: 'starting-engine', games: 10 })).toBe('done')
    expect(stepStatus('quick', { phase: 'starting-engine', games: 10 })).toBe('current')
    expect(stepStatus('quick', deep)).toBe('done')
    expect(stepStatus('deep', deep)).toBe('current')
  })
})
