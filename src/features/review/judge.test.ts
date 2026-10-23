import { describe, expect, it } from 'vitest'
import { judge, shallowPositions, withDeepPosition, type AnalysedPosition } from './analyze'
import { DEFAULT_CRITERIA } from './criteria'
import type { ReviewGame } from './games'
import { replay } from './positions'

const game = {
  source: 'lichess',
  id: 'g1',
  url: 'https://lichess.org/g1',
  playedAt: new Date(0),
  color: 'white',
  opponent: { name: 'bob' },
  sanMoves: ['e4', 'e5', 'Qh5', 'Nc6'],
} as unknown as ReviewGame

/** The game's positions with these evaluations (White's side), quick ones unless listed. */
function positions(cps: number[], precise: number[] = []): AnalysedPosition[] {
  return replay(game.sanMoves).map((position, index) => ({
    ...position,
    cp: cps[index]!,
    precise: precise.includes(index),
  }))
}

describe('judge', () => {
  it("finds each side's errors", () => {
    // White blunders with Qh5 (+0.3 → -3.0), Black answers with one (-3.0 → +3.0)
    const judged = judge(game, positions([30, 30, 30, -300, 300]), DEFAULT_CRITERIA)
    expect(judged.mistakes.map((mistake) => mistake.ply)).toEqual([2])
    expect(judged.opponentErrors).toEqual([3])
  })

  it('judges again once a position is deepened', () => {
    const judged = judge(game, positions([30, 30, -300, -300, -300], [0]), DEFAULT_CRITERIA)
    expect(shallowPositions(judged)).toEqual([1, 2, 3, 4])
    // The deep look shows Qh5 was fine after all
    const deepened = withDeepPosition(judged, 3, 20, DEFAULT_CRITERIA)
    expect(deepened.positions[3]).toMatchObject({ cp: 20, precise: true })
    expect(shallowPositions(deepened)).toEqual([1, 2, 4])
  })
})
