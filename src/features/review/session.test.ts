import { describe, expect, it } from 'vitest'
import { freeNumber } from './session'

describe('freeNumber', () => {
  it('gives the smallest number no open training has', () => {
    expect(freeNumber([])).toBe(1)
    expect(freeNumber([{ number: 1 }])).toBe(2)
    expect(freeNumber([{ number: 1 }, { number: 3 }])).toBe(2)
    expect(freeNumber([{ number: 2 }])).toBe(1)
  })
})
