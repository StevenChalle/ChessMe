import { describe, expect, it } from 'vitest'
import { MATE_CP } from '@/features/review/errors'
import { acceptedAssessments, assess, isAccepted } from './assessment'

describe('assess', () => {
  it('reads the evaluation from White side, boundaries included in equal and winning', () => {
    expect(assess(0)).toBe('equal')
    expect(assess(30)).toBe('equal')
    expect(assess(-30)).toBe('equal')
    expect(assess(31)).toBe('white-better')
    expect(assess(-150)).toBe('black-better')
    expect(assess(199)).toBe('white-better')
    expect(assess(200)).toBe('white-winning')
    expect(assess(-MATE_CP)).toBe('black-winning')
  })
})

describe('acceptedAssessments', () => {
  it('accepts only the word when far from any boundary', () => {
    expect(acceptedAssessments(0)).toEqual(['equal'])
    expect(acceptedAssessments(100)).toEqual(['white-better'])
    expect(acceptedAssessments(500)).toEqual(['white-winning'])
  })

  it('accepts the neighbor within 0.15 of ±0.3', () => {
    expect(acceptedAssessments(40).toSorted()).toEqual(['equal', 'white-better'])
    expect(acceptedAssessments(-20).toSorted()).toEqual(['black-better', 'equal'])
    expect(acceptedAssessments(46)).toEqual(['white-better'])
    expect(acceptedAssessments(14)).toEqual(['equal'])
  })

  it('accepts the neighbor within 0.3 of ±2.0', () => {
    expect(acceptedAssessments(175).toSorted()).toEqual(['white-better', 'white-winning'])
    expect(acceptedAssessments(-230).toSorted()).toEqual(['black-better', 'black-winning'])
    expect(acceptedAssessments(231)).toEqual(['white-winning'])
  })

  it('never accepts the other side', () => {
    expect(isAccepted('black-better', 10)).toBe(false)
    expect(isAccepted('white-better', 10)).toBe(false)
    expect(isAccepted('white-winning', MATE_CP)).toBe(true)
  })
})
