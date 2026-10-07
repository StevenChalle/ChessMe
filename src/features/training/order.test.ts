import { describe, expect, it } from 'vitest'
import type { Mistake } from '@/features/review/analyze'
import { defaultTrainingOptions, mistakesByGame, trainingPuzzles } from './order'

/** An error of game `game` at `ply`, losing about `drop` % (from +1.00 to a lower evaluation). */
function mistake(game: string, ply: number, afterCp = -300): Mistake {
  return {
    id: `${game}-${ply}`,
    ply,
    game: { url: game },
    beforeCp: 100,
    afterCp,
  } as Mistake
}

const ids = (mistakes: Mistake[]) => mistakes.map((item) => item.id)

/** A sequence of random numbers, repeated. */
const sequence = (...values: number[]) => {
  let index = 0
  return () => values[index++ % values.length]!
}

// Three games, their errors listed out of order (as an analysis may list games).
const ALL = [
  mistake('a', 30),
  mistake('a', 10),
  mistake('b', 5),
  mistake('a', 20),
  mistake('c', 8),
  mistake('b', 15),
]
const DEFAULTS = defaultTrainingOptions(10)

describe('mistakesByGame', () => {
  it('groups by game, each in the order of its moves', () => {
    expect(mistakesByGame(ALL, 10).map(ids)).toEqual([
      ['a-10', 'a-20', 'a-30'],
      ['b-5', 'b-15'],
      ['c-8'],
    ])
  })

  it('leaves out errors below the minimum drop', () => {
    const small = mistake('a', 40, 50) // +1.00 → +0.50: a few % only
    expect(ids(mistakesByGame([...ALL, small], 10).flat())).not.toContain('a-40')
    expect(ids(mistakesByGame([...ALL, small], 1).flat())).toContain('a-40')
  })
})

describe('trainingPuzzles', () => {
  it('plays game after game by default, each in the order of its moves', () => {
    const puzzles = trainingPuzzles(ALL, DEFAULTS, Math.random)
    expect(puzzles).toHaveLength(6)
    // Whatever the order of the games, a game's errors follow each other, in order.
    const games = ids(puzzles).map((id) => id[0])
    expect(games.join('')).toMatch(/^(a{3}|b{2}|c)+$/)
    for (const game of ['a', 'b']) {
      const plies = puzzles.filter((item) => item.game.url === game).map((item) => item.ply)
      expect(plies).toEqual(plies.toSorted((x, y) => x - y))
    }
  })

  it('keeps only the first games when limited', () => {
    const puzzles = trainingPuzzles(ALL, { ...DEFAULTS, maxGames: 1 }, () => 0.999)
    expect(new Set(puzzles.map((item) => item.game.url)).size).toBe(1)
  })

  it('interleaves games, each keeping the order of its moves', () => {
    const puzzles = trainingPuzzles(
      ALL,
      { ...DEFAULTS, interleaveGames: true },
      sequence(0.1, 0.9, 0.5, 0.3, 0.7),
    )
    expect(puzzles).toHaveLength(6)
    expect(
      ids(puzzles)
        .map((id) => id[0])
        .join(''),
    ).not.toMatch(/^(a{3}|b{2}|c)+$/)
    for (const game of ['a', 'b']) {
      const plies = puzzles.filter((item) => item.game.url === game).map((item) => item.ply)
      expect(plies).toEqual(plies.toSorted((x, y) => x - y))
    }
  })

  it('shuffles the positions within a game when asked', () => {
    const puzzles = trainingPuzzles(ALL, { ...DEFAULTS, shuffleWithinGame: true }, () => 0)
    const plies = puzzles.filter((item) => item.game.url === 'a').map((item) => item.ply)
    expect(plies).not.toEqual([10, 20, 30])
    expect(plies.toSorted((x, y) => x - y)).toEqual([10, 20, 30])
  })

  it('keeps every position with both options, in any order', () => {
    const puzzles = trainingPuzzles(
      ALL,
      { ...DEFAULTS, interleaveGames: true, shuffleWithinGame: true },
      sequence(0.4, 0.2, 0.8),
    )
    expect(ids(puzzles).toSorted()).toEqual(ids(ALL).toSorted())
  })
})
