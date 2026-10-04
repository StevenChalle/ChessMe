import { describe, expect, it } from 'vitest'
import { MATE_CP } from '@/features/review/errors'
import { evalDelta, formatDelta, formatEval } from './evaluation'

describe('evaluation display', () => {
  it('shows pawns with one decimal and a sign', () => {
    expect(formatEval(150)).toBe('+1.5')
    expect(formatEval(-34)).toBe('-0.3')
    expect(formatEval(0)).toBe('0.0')
  })

  it('shows mates without a number', () => {
    expect(formatEval(MATE_CP)).toBe('+#')
    expect(formatEval(-MATE_CP)).toBe('-#')
  })

  it('computes the change, except around mates', () => {
    expect(evalDelta(80, -40)).toBe(-120)
    expect(formatDelta(-120)).toBe('-1.2')
    expect(evalDelta(MATE_CP, 300)).toBeUndefined()
  })
})
