import { describe, expect, it } from 'vitest'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { LichessGame } from '@/lib/lichess/types'
import {
  bufferedGames,
  nextPage,
  startFeed,
  withChessComRatingDiffs,
  type FeedFetchers,
} from './feed'

const DAY = 86_400_000

function lichessGame(id: string, day: number, overrides: Partial<LichessGame> = {}): LichessGame {
  return {
    id,
    rated: true,
    variant: 'standard',
    speed: 'blitz',
    perf: 'blitz',
    createdAt: day * DAY,
    lastMoveAt: day * DAY + 600_000,
    status: 'resign',
    players: {
      white: { user: { id: 'alice', name: 'Alice' }, rating: 1500, ratingDiff: 7 },
      black: { user: { id: 'bob', name: 'Bob' }, rating: 1600, ratingDiff: -7 },
    },
    winner: 'white',
    moves: '',
    clock: { initial: 180, increment: 2, totalTime: 260 },
    ...overrides,
  }
}

function chessComGame(
  uuid: string,
  day: number,
  rating: number,
  timeClass = 'blitz',
): ChessComGame {
  return {
    url: `https://www.chess.com/game/live/${uuid}`,
    uuid,
    time_control: '180+2',
    time_class: timeClass,
    rules: 'chess',
    rated: true,
    end_time: (day * DAY) / 1000,
    white: { username: 'Alice', rating, result: 'win' },
    black: { username: 'carol', rating: 1400, result: 'resigned' },
  }
}

describe('history feed', () => {
  it('merges both platforms newest first, page by page', async () => {
    const lichess = [lichessGame('l3', 30), lichessGame('l2', 20), lichessGame('l1', 10)]
    const fetchers: FeedFetchers = {
      lichessPage: async (_user, _max, until) =>
        lichess.filter((game) => until === undefined || game.createdAt <= until),
      chessComArchives: async () => ['m1', 'm2'],
      chessComMonth: async (url: string) =>
        url === 'm2'
          ? [chessComGame('c2', 25, 1210), chessComGame('c3', 28, 1200)]
          : [chessComGame('c1', 5, 1190)],
    }
    const state = startFeed([
      { source: 'lichess', username: 'alice' },
      { source: 'chesscom', username: 'alice' },
    ])

    const first = await nextPage(state, fetchers, undefined, 3)
    expect(first.games.map((game) => game.id)).toEqual(['l3', 'c3', 'c2'])
    expect(first.hasMore).toBe(true)

    const second = await nextPage(first.state, fetchers, undefined, 3)
    expect(second.games.map((game) => game.id)).toEqual(['l2', 'l1', 'c1'])
    // The first page is untouched: its state can be replayed.
    expect(first.state.sources[0]!.buffer.map((game) => game.id)).toEqual(['l2', 'l1'])
  })

  it('only lists rated standard games, like the review (no casual games, no variants)', async () => {
    const lichess = [
      lichessGame('casual', 40, { rated: false }),
      lichessGame('960', 35, { variant: 'chess960' }),
      lichessGame('l1', 30),
    ]
    const fetchers: FeedFetchers = {
      lichessPage: async () => lichess,
      chessComArchives: async () => ['m1', 'm2'],
      // The newest month has nothing to keep: the feed moves on to the previous one.
      chessComMonth: async (url: string) =>
        url === 'm2'
          ? [
              { ...chessComGame('c-casual', 45, 1200), rated: false },
              { ...chessComGame('c-960', 44, 1200), rules: 'chess960' },
            ]
          : [chessComGame('c1', 20, 1190)],
    }
    const state = startFeed([
      { source: 'lichess', username: 'alice' },
      { source: 'chesscom', username: 'alice' },
    ])

    const page = await nextPage(state, fetchers)
    expect(page.games.map((game) => game.id)).toEqual(['l1', 'c1'])
  })

  it('gives the rating change: Lichess directly, Chess.com from the previous game of the pool', async () => {
    const fetchers: FeedFetchers = {
      lichessPage: async () => [lichessGame('l1', 10)],
      chessComArchives: async () => ['m1'],
      chessComMonth: async () => [
        chessComGame('c1', 1, 1180),
        chessComGame('r1', 2, 1500, 'rapid'),
        chessComGame('c2', 3, 1195),
      ],
    }
    const page = await nextPage(
      startFeed([
        { source: 'lichess', username: 'alice' },
        { source: 'chesscom', username: 'alice' },
      ]),
      fetchers,
    )
    const games = withChessComRatingDiffs(page.games, bufferedGames(page.state))
    const byId = Object.fromEntries(games.map((game) => [game.id, game]))
    expect(byId.l1).toMatchObject({ rating: 1507, ratingDiff: 7 })
    expect(byId.c2).toMatchObject({ rating: 1195, ratingDiff: 15 })
    expect(byId.c1!.ratingDiff).toBeUndefined()
    expect(page.hasMore).toBe(false)
  })

  it('keeps going with the other platform when one fails', async () => {
    const fetchers: FeedFetchers = {
      lichessPage: async () => {
        throw new Error('down')
      },
      chessComArchives: async () => ['m1'],
      chessComMonth: async () => [chessComGame('c1', 1, 1180)],
    }
    const page = await nextPage(
      startFeed([
        { source: 'lichess', username: 'alice' },
        { source: 'chesscom', username: 'alice' },
      ]),
      fetchers,
    )
    expect(page.games.map((game) => game.id)).toEqual(['c1'])
    expect(page.state.failures.map((failure) => failure.source)).toEqual(['lichess'])
  })

  it('completes the Chess.com change with games fetched beyond the page', () => {
    const summary = (id: string, day: number, rating: number) => ({
      source: 'chesscom' as const,
      id,
      url: '',
      playedAt: new Date(day * DAY),
      category: 'blitz' as const,
      timeControl: { kind: 'clock' as const, initial: 180, increment: 0 },
      rated: true,
      color: 'white' as const,
      rating,
      opponent: { name: 'x' },
      result: 'win' as const,
    })
    const [shown] = withChessComRatingDiffs([summary('new', 3, 1210)], [summary('old', 1, 1200)])
    expect(shown!.ratingDiff).toBe(10)
  })
})
