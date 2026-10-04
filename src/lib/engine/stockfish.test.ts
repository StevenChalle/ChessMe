import { describe, expect, it } from 'vitest'
import { completeLines } from './stockfish'

describe('completeLines', () => {
  it('keeps the deepest complete iteration, ignoring a partial last one', () => {
    const byDepth = new Map([
      [
        11,
        new Map([
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ]),
      ],
      [
        12,
        new Map([
          [1, 'b'],
          [2, 'a'],
          [3, 'd'],
        ]),
      ],
      [13, new Map([[1, 'b']])],
    ])
    expect(completeLines(byDepth)).toEqual(['b', 'a', 'd'])
  })

  it('handles a single line and no line at all', () => {
    expect(completeLines(new Map([[5, new Map([[1, 'a']])]]))).toEqual(['a'])
    expect(completeLines(new Map())).toEqual([])
  })
})
