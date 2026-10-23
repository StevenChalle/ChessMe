import { describe, expect, it } from 'vitest'
import { readPgn, toReviewGame } from '@/features/import/pgn'
import { importLibrary } from './library'
import { defaultSelection } from './selection'

const pgn = (day: string, result: string, moves: string) => `[White "me"]
[Black "you"]
[Date "2026.10.${day}"]
[Result "${result}"]
[TimeControl "180+0"]

${moves} ${result}
`

const games = readPgn(
  [
    pgn('10', '1-0', '1. e4 e5'),
    pgn('12', '0-1', '1. d4 d5'),
    pgn('11', '1/2-1/2', '1. c4 c5'),
  ].join('\n'),
).games.map((game) => toReviewGame(game, 'white'))
const signal = new AbortController().signal

describe('importLibrary', () => {
  const library = importLibrary(games)

  it('keeps the games of the selection, newest first', async () => {
    const selection = {
      ...defaultSelection(['import']),
      scope: { kind: 'latest', count: 2 } as const,
    }
    const found = await library.find(selection, signal)
    expect(found.games.map((game) => game.playedAt.getUTCDate())).toEqual([12, 11])
    const wins = await library.find({ ...selection, results: ['win'] }, signal)
    expect(wins.games).toHaveLength(1)
  })

  it('finds one game by its id', async () => {
    const found = await library.findOne({ source: 'import', id: games[1]!.id }, signal)
    expect(found.games).toEqual([games[1]])
  })
})
