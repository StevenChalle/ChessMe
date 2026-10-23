import { describe, expect, it } from 'vitest'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { GameExportOptions } from '@/lib/lichess/client'
import type { LichessGame } from '@/lib/lichess/types'
import {
  findGame,
  findGames,
  type FetchProgress,
  type GameFetchers,
  type SingleGameFetchers,
} from './fetch'
import { defaultSelection, type GameSelection } from './selection'

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
      white: { user: { id: 'alice', name: 'Alice' }, rating: 1500 },
      black: { user: { id: 'bob', name: 'Bob' }, rating: 1600 },
    },
    winner: 'white',
    moves: 'e4 e5 Nf3 Nc6',
    clock: { initial: 180, increment: 0, totalTime: 180 },
    ...overrides,
  }
}

function chessComGame(
  uuid: string,
  day: number,
  overrides: Partial<ChessComGame> = {},
): ChessComGame {
  return {
    url: `https://www.chess.com/game/live/${uuid}`,
    uuid,
    time_control: '180',
    time_class: 'blitz',
    rules: 'chess',
    rated: true,
    end_time: (day * DAY) / 1000,
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'carol', rating: 1400, result: 'resigned' },
    pgn: '1. e4 e5 2. Nf3 Nc6 1-0',
    ...overrides,
  }
}

const lichessOnly = [{ source: 'lichess' as const, username: 'alice' }]

describe('findGames', () => {
  it('sends the time controls, a single color and rated or casual to Lichess', async () => {
    const calls: GameExportOptions[] = []
    const fetchers = {
      lichessExport: async (_user: string, options: GameExportOptions) => {
        calls.push(options)
        return []
      },
    } as unknown as GameFetchers
    await findGames(
      lichessOnly,
      { ...defaultSelection(['lichess']), categories: ['bullet', 'daily'], colors: ['black'] },
      { fetchers },
    )
    expect(calls[0]).toMatchObject({
      perfTypes: ['ultraBullet', 'bullet', 'correspondence'],
      color: 'black',
    })
  })

  it('pages backwards on Lichess until enough games match the filters checked here', async () => {
    // Pages of 100: only every other game is a loss
    const all = Array.from({ length: 250 }, (_, i) =>
      lichessGame(`g${i}`, 1000 - i, { winner: i % 2 === 0 ? 'black' : 'white' }),
    )
    const untils: (number | undefined)[] = []
    const fetchers = {
      lichessExport: async (_user: string, { max, until }: GameExportOptions) => {
        untils.push(until)
        return all.filter((game) => until === undefined || game.createdAt <= until).slice(0, max)
      },
    } as unknown as GameFetchers
    const selection: GameSelection = {
      ...defaultSelection(['lichess']),
      scope: { kind: 'latest', count: 60 },
      results: ['loss'],
    }
    const { games } = await findGames(lichessOnly, selection, { fetchers })
    expect(games).toHaveLength(60)
    expect(games.every((game) => game.result === 'loss')).toBe(true)
    expect(untils).toEqual([undefined, (1000 - 99) * DAY - 1])
  })

  it('asks Lichess for exactly the count when nothing is filtered here', async () => {
    const maxes: (number | undefined)[] = []
    const fetchers = {
      lichessExport: async (_user: string, { max }: GameExportOptions) => {
        maxes.push(max)
        return [lichessGame('last', 10)]
      },
    } as unknown as GameFetchers
    const { games } = await findGames(
      lichessOnly,
      { ...defaultSelection(['lichess']), scope: { kind: 'latest', count: 1 } },
      { fetchers },
    )
    expect(maxes).toEqual([1])
    expect(games.map((game) => game.id)).toEqual(['last'])
  })

  it('asks Lichess for a date range with a margin, then checks the end dates', async () => {
    let options: GameExportOptions | undefined
    const fetchers = {
      lichessExport: async (_user: string, received: GameExportOptions) => {
        options = received
        return [lichessGame('in', 15), lichessGame('before', 5)]
      },
    } as unknown as GameFetchers
    const selection: GameSelection = {
      ...defaultSelection(['lichess']),
      scope: { kind: 'range', from: 10 * DAY, to: 20 * DAY },
    }
    const { games } = await findGames(lichessOnly, selection, { fetchers })
    expect(games.map((game) => game.id)).toEqual(['in'])
    // Correspondence is selected by default: games may have started long before
    expect(options?.since).toBe(10 * DAY - 60 * DAY)
    expect(options?.until).toBe(20 * DAY)
  })

  it('keeps the latest games of a date range up to its maximum', async () => {
    const all = Array.from({ length: 150 }, (_, i) => lichessGame(`g${i}`, 299 - i))
    const calls: GameExportOptions[] = []
    const fetchers = {
      lichessExport: async (_user: string, options: GameExportOptions) => {
        calls.push(options)
        return all
          .filter((game) => options.until === undefined || game.createdAt <= options.until)
          .slice(0, options.max)
      },
    } as unknown as GameFetchers
    const selection: GameSelection = {
      ...defaultSelection(['lichess']),
      categories: ['blitz'],
      scope: { kind: 'range', from: 100 * DAY, to: 300 * DAY, max: 30 },
    }
    const { games } = await findGames(lichessOnly, selection, { fetchers })
    expect(games.map((game) => game.id)).toEqual(all.slice(0, 30).map((game) => game.id))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ max: 100, since: 99 * DAY, until: 300 * DAY })
  })

  it('stops opening Chess.com months once a range has its maximum', async () => {
    const opened: string[] = []
    const fetchers = {
      chessComArchives: async () => ['m1', 'm2', 'm3'],
      chessComMonth: async (url: string) => {
        opened.push(url)
        const day = Number(url.slice(1)) * 30
        return [chessComGame(`${url}a`, day), chessComGame(`${url}b`, day + 1)]
      },
    } as unknown as GameFetchers
    const selection: GameSelection = {
      ...defaultSelection(['chesscom']),
      scope: { kind: 'range', from: 0, to: 1000 * DAY, max: 3 },
    }
    const { games } = await findGames([{ source: 'chesscom', username: 'alice' }], selection, {
      fetchers,
    })
    expect(opened).toEqual(['m3', 'm2'])
    expect(games.map((game) => game.id)).toEqual(['m3b', 'm3a', 'm2b'])
  })

  it('only opens the Chess.com months of the range, newest first', async () => {
    const opened: string[] = []
    const base = 'https://api.chess.com/pub/player/alice/games'
    const fetchers = {
      chessComArchives: async () => [`${base}/2026/07`, `${base}/2026/08`, `${base}/2026/09`],
      chessComMonth: async (url: string) => {
        opened.push(url.slice(-7))
        return [chessComGame(url.slice(-2), Date.UTC(2026, 7, 20) / DAY)]
      },
    } as unknown as GameFetchers
    const selection: GameSelection = {
      ...defaultSelection(['chesscom']),
      scope: { kind: 'range', from: Date.UTC(2026, 7, 10), to: Date.UTC(2026, 7, 25) },
    }
    const { games } = await findGames([{ source: 'chesscom', username: 'alice' }], selection, {
      fetchers,
    })
    expect(opened).toEqual(['2026/08'])
    expect(games).toHaveLength(1)
  })

  it('merges both platforms newest first and keeps going when one fails', async () => {
    const fetchers: GameFetchers = {
      lichessExport: async () => {
        throw new Error('down')
      },
      chessComArchives: async () => ['m1', 'm2'],
      chessComMonth: async (url) =>
        url === 'm2' ? [chessComGame('c2', 20), chessComGame('c3', 30)] : [chessComGame('c1', 10)],
    }
    const accounts = [
      { source: 'lichess' as const, username: 'alice' },
      { source: 'chesscom' as const, username: 'alice' },
    ]
    const selection: GameSelection = {
      ...defaultSelection(['lichess', 'chesscom']),
      scope: { kind: 'latest', count: 2 },
    }
    const { games, failures } = await findGames(accounts, selection, { fetchers })
    expect(games.map((game) => game.id)).toEqual(['c3', 'c2'])
    expect(failures.map((failure) => failure.source)).toEqual(['lichess'])
  })

  it('skips platforms left out of the selection', async () => {
    const fetchers = {
      lichessExport: async () => {
        throw new Error('should not be called')
      },
      chessComArchives: async () => [],
    } as unknown as GameFetchers
    const accounts = [
      { source: 'lichess' as const, username: 'alice' },
      { source: 'chesscom' as const, username: 'alice' },
    ]
    const { failures } = await findGames(
      accounts,
      { ...defaultSelection(['lichess', 'chesscom']), sources: ['chesscom'] },
      { fetchers },
    )
    expect(failures).toEqual([])
  })
})

describe('findGames progress', () => {
  it('reports the Lichess games as they stream in, out of the number wanted', async () => {
    const fetchers = {
      lichessExport: async (
        _user: string,
        _options: GameExportOptions,
        _signal: AbortSignal | undefined,
        onGame?: (game: LichessGame) => void,
      ) => {
        const games = [lichessGame('a', 30), lichessGame('b', 20), lichessGame('c', 10)]
        for (const game of games) onGame?.(game)
        return games
      },
    } as unknown as GameFetchers
    const reports: FetchProgress[] = []
    await findGames(
      lichessOnly,
      { ...defaultSelection(['lichess']), scope: { kind: 'latest', count: 4 } },
      { fetchers, onProgress: (progress) => reports.push(progress) },
    )
    expect(reports.map((report) => report.lichess)).toEqual([
      { games: 1, ratio: 0.25 },
      { games: 2, ratio: 0.5 },
      { games: 3, ratio: 0.75 },
      // Fewer games than wanted: the search is over all the same.
      { games: 3, ratio: 1 },
    ])
  })

  it('measures a Lichess period by the dates covered', async () => {
    const fetchers = {
      lichessExport: async (
        _user: string,
        _options: GameExportOptions,
        _signal: AbortSignal | undefined,
        onGame?: (game: LichessGame) => void,
      ) => {
        const games = [lichessGame('a', 90), lichessGame('b', 50)]
        for (const game of games) onGame?.(game)
        return games
      },
    } as unknown as GameFetchers
    const reports: FetchProgress[] = []
    await findGames(
      lichessOnly,
      {
        ...defaultSelection(['lichess']),
        scope: { kind: 'range', from: 1 * DAY, to: 101 * DAY },
      },
      { fetchers, onProgress: (progress) => reports.push(progress) },
    )
    // From day 101 back to day -59 (60 days of margin for correspondence games): 51 days of 160.
    expect(reports[1]!.lichess!.ratio).toBeCloseTo(51 / 160)
    expect(reports.at(-1)!.lichess).toEqual({ games: 2, ratio: 1 })
  })

  it('counts the Chess.com months read', async () => {
    const fetchers = {
      chessComArchives: async () => ['m1', 'm2', 'm3', 'm4'],
      chessComMonth: async (url: string) => [chessComGame(url, Number(url.slice(1)) * 10)],
    } as unknown as GameFetchers
    const reports: FetchProgress[] = []
    await findGames(
      [{ source: 'chesscom', username: 'alice' }],
      { ...defaultSelection(['chesscom']), scope: { kind: 'latest', count: 100 } },
      { fetchers, onProgress: (progress) => reports.push(progress) },
    )
    expect(reports.map((report) => report.chesscom)).toEqual([
      { games: 0, ratio: 0 },
      { games: 1, ratio: 0.25 },
      { games: 2, ratio: 0.5 },
      { games: 3, ratio: 0.75 },
      { games: 4, ratio: 1 },
      { games: 4, ratio: 1 },
    ])
  })
})

describe('findGame', () => {
  it('fetches a Lichess game by its id', async () => {
    const fetchers = {
      lichessGame: async (id: string) => lichessGame(id, 10),
    } as unknown as SingleGameFetchers
    const found = await findGame(lichessOnly, { source: 'lichess', id: 'abcd1234' }, { fetchers })
    expect(found.games.map((game) => game.id)).toEqual(['abcd1234'])
    expect(found.games[0]?.sanMoves).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
  })

  it("looks for a Chess.com game in its month's archive", async () => {
    const urls: string[] = []
    const fetchers = {
      chessComMonth: async (url: string) => {
        urls.push(url)
        return [chessComGame('one', 10), chessComGame('two', 11)]
      },
    } as unknown as SingleGameFetchers
    const found = await findGame(
      [{ source: 'chesscom', username: 'Alice' }],
      { source: 'chesscom', id: 'two', year: 2026, month: 3 },
      { fetchers },
    )
    expect(urls).toEqual(['https://api.chess.com/pub/player/alice/games/2026/03'])
    expect(found.games.map((game) => game.id)).toEqual(['two'])
  })

  it('finds nothing without an account on that platform, and reports failures', async () => {
    const fetchers = {
      lichessGame: async () => {
        throw new Error('down')
      },
    } as unknown as SingleGameFetchers
    const ref = { source: 'lichess' as const, id: 'abcd1234' }
    expect(await findGame([], ref, { fetchers })).toEqual({ games: [], failures: [] })
    const failed = await findGame(lichessOnly, ref, { fetchers })
    expect(failed.games).toEqual([])
    expect(failed.failures.map((failure) => failure.source)).toEqual(['lichess'])
  })
})
