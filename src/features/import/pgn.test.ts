import { describe, expect, it } from 'vitest'
import { categoryOf, missingInfo, playerNames, readPgn, sideOf, toReviewGame } from './pgn'

const LICHESS = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abcd1234"]
[White "Alice"]
[Black "bob"]
[Result "1-0"]
[UTCDate "2026.10.22"]
[UTCTime "18:45:12"]
[WhiteElo "1500"]
[BlackElo "1480"]
[TimeControl "180+2"]

1. e4 { [%eval 0.3] [%clk 0:03:00] } 1... e5 { [%eval 0.25] [%clk 0:02:59] } 2. Qh5 { [%eval -0.5] [%clk 0:02:58] } 2... Nc6 { [%eval #3] [%clk 0:02:55] } 1-0
`

const CHESSCOM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.10.20"]
[White "carol"]
[Black "alice"]
[Result "1/2-1/2"]
[TimeControl "600"]
[Link "https://www.chess.com/game/live/123"]

1. d4 d5 2. c4 1/2-1/2
`

const OTB = `[White "Alice"]
[Black "Dan"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1
`

const IGNORED = `[Variant "Chess960"]
[Result "1-0"]
[FEN "bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1"]
[SetUp "1"]

1. e4 1-0

[White "x"]
[Black "y"]
[Result "*"]

1. e4 *

[White "x"]
[Black "y"]
[Result "1-0"]

1. e4 e5 2. Ke3 1-0
`

describe('readPgn', () => {
  it('reads tags, moves, clocks and evaluations', () => {
    const { games, ignored } = readPgn(LICHESS + '\n' + CHESSCOM + '\n' + OTB)
    expect(ignored).toEqual({ unreadable: 0, variant: 0, unfinished: 0, duplicate: 0 })
    expect(games).toHaveLength(3)
    const [lichess, chesscom, otb] = games
    expect(lichess).toMatchObject({
      index: 0,
      white: 'Alice',
      whiteElo: 1500,
      result: '1-0',
      playedAt: new Date(Date.UTC(2026, 9, 22, 18, 45, 12)),
      timeControl: { kind: 'clock', initial: 180, increment: 2 },
      rated: true,
      url: 'https://lichess.org/abcd1234',
      sanMoves: ['e4', 'e5', 'Qh5', 'Nc6'],
      clocks: [180, 179, 178, 175],
    })
    expect(lichess!.evals).toEqual([30, 25, -50, 10_000])
    expect(chesscom).toMatchObject({
      url: 'https://www.chess.com/game/live/123',
      timeControl: { kind: 'clock', initial: 600, increment: 0 },
      playedAt: new Date(Date.UTC(2026, 9, 20)),
    })
    expect(otb).toMatchObject({ playedAt: undefined, timeControl: { kind: 'unknown' } })
  })

  it('counts the games left out, by reason, and duplicates', () => {
    const { games, ignored } = readPgn(IGNORED + '\n' + OTB + '\n' + OTB)
    expect(games).toHaveLength(1)
    expect(ignored).toEqual({ unreadable: 1, variant: 1, unfinished: 1, duplicate: 1 })
  })
})

describe('players and sides', () => {
  const { games } = readPgn(LICHESS + '\n' + CHESSCOM + '\n' + OTB)

  it('lists names by number of games, case aside', () => {
    expect(playerNames(games)).toEqual([
      { name: 'Alice', games: 3 },
      { name: 'bob', games: 1 },
      { name: 'carol', games: 1 },
      { name: 'Dan', games: 1 },
    ])
  })

  it('finds the side of the chosen names, unless both or neither play', () => {
    expect(games.map((game) => sideOf(game, ['alice']))).toEqual(['white', 'black', 'white'])
    expect(sideOf(games[0]!, ['Alice', 'bob'])).toBeUndefined()
    expect(sideOf(games[0]!, ['Zed'])).toBeUndefined()
  })

  it('tells what is missing', () => {
    expect(missingInfo(games)).toEqual({ date: 1, timeControl: 1, ratings: 2 })
  })
})

describe('toReviewGame', () => {
  it("turns a game to the player's side", () => {
    const [lichess, , otb] = readPgn(LICHESS + '\n' + CHESSCOM + '\n' + OTB).games
    expect(toReviewGame(lichess!, 'black')).toMatchObject({
      source: 'import',
      color: 'black',
      result: 'loss',
      category: 'blitz',
      opponent: { name: 'Alice', rating: 1500 },
      serverCps: [30, 25, -50, 10_000],
      clock: { initial: 180, remaining: [180, 179, 178, 175] },
    })
    // Undated: ordered by its place in the file
    expect(toReviewGame(otb!, 'white')).toMatchObject({
      undated: true,
      playedAt: new Date(2),
      category: 'unknown',
      result: 'loss',
      url: undefined,
    })
  })

  it('sorts time controls like Lichess', () => {
    expect(categoryOf({ kind: 'clock', initial: 60, increment: 0 })).toBe('bullet')
    expect(categoryOf({ kind: 'clock', initial: 180, increment: 2 })).toBe('blitz')
    expect(categoryOf({ kind: 'clock', initial: 600, increment: 5 })).toBe('rapid')
    expect(categoryOf({ kind: 'clock', initial: 1800, increment: 0 })).toBe('classical')
    expect(categoryOf({ kind: 'daily', days: 3 })).toBe('daily')
  })
})
