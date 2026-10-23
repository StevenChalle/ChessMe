import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, DB_NAME, type StoredGame } from '@/lib/db'
import type { LichessGame } from '@/lib/lichess/types'
import {
  accountKey,
  clearGameStore,
  createGameStore,
  GameStoreError,
  storedAccounts,
  storedSummary,
  toStoredGame,
} from './store'

const DAY = 86_400_000

const lichessGame = (id: string, day: number): LichessGame => ({
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
  moves: 'e4 e5',
  clock: { initial: 180, increment: 0, totalTime: 180 },
})

const stored = (id: string, day: number, username = 'Alice') =>
  toStoredGame('lichess', username, lichessGame(id, day))!

let db: AppDatabase
let time: number

beforeEach(async () => {
  await Dexie.delete(DB_NAME)
  db = new AppDatabase()
  time = 1000
})

afterEach(() => db.close())

const store = (maxGames?: number, kept: string[] = []) =>
  createGameStore(() => db, {
    now: () => time,
    kept: () => kept,
    ...(maxGames !== undefined && { maxGames }),
  })

describe('toStoredGame', () => {
  it("keeps the game with its summary from the account's side", () => {
    const game = stored('g1', 10)
    expect(game).toMatchObject({
      account: 'lichess:alice',
      id: 'g1',
      createdAt: 10 * DAY,
      playedAt: 10 * DAY + 600_000,
      summary: { color: 'white', result: 'win', category: 'blitz' },
    })
    expect(toStoredGame('lichess', 'alice', { ...lichessGame('v', 1), variant: 'chess960' })).toBe(
      undefined,
    )
  })

  it('makes the summary again when its rules changed', () => {
    const game: StoredGame = { ...stored('g1', 10), summaryVersion: 0, summary: {} as never }
    expect(storedSummary(game, 'alice')).toMatchObject({ id: 'g1', color: 'white' })
  })
})

describe('createGameStore', () => {
  it('merges the periods of each perf', async () => {
    const games = store()
    await games.addLichessPeriods('lichess:alice', { blitz: { from: 0, to: 10 } })
    await games.addLichessPeriods('lichess:alice', {
      blitz: { from: 11, to: 20 },
      bullet: { from: 5, to: 6 },
    })
    expect((await games.loadSync('lichess:alice')).lichess).toEqual({
      blitz: [{ from: 0, to: 20 }],
      bullet: [{ from: 5, to: 6 }],
    })
  })

  it('reads the games newest first, filtered and limited', async () => {
    const games = store()
    await games.put([stored('a', 1), stored('b', 3), stored('c', 2), stored('x', 9, 'Bob')])
    const read = await games.query('lichess:alice', 0, Infinity, (game) => game.id !== 'b', 5)
    expect(read.map((game) => game.id)).toEqual(['c', 'a'])
    expect(
      (await games.query('lichess:alice', 2 * DAY, 3 * DAY, () => true)).map((game) => game.id),
    ).toEqual(['c'])
  })

  it('removes whole accounts, the least recently searched first, never the current one', async () => {
    const games = store(4)
    await games.put([stored('a1', 1), stored('a2', 2), stored('a3', 3)])
    await games.touch(accountKey('lichess', 'alice'))
    time = 2000
    await games.put(
      ['b1', 'b2', 'b3'].map((id, index) =>
        toStoredGame('lichess', 'Bob', lichessGame(id, index))!,
      ),
    )
    await games.touch('lichess:bob')
    expect(await db.accountGames.where('account').equals('lichess:alice').count()).toBe(0)
    expect(await db.accountGames.count()).toBe(3)
    expect(await db.accountSync.get('lichess:alice')).toBeUndefined()
  })

  it('recycles the oldest games of the main accounts once the limit is reached', async () => {
    const games = store(4, ['lichess:alice'])
    await games.put([1, 2, 3, 4, 5, 6].map((day) => stored(`a${day}`, day)))
    await games.addLichessPeriods('lichess:alice', { blitz: { from: 0, to: 10 * DAY } })
    await games.touch('lichess:alice')
    // Down to 90 % of 4: the three oldest go, the newest stay.
    const left = await db.accountGames.toArray()
    expect(left.map((game) => game.id).toSorted()).toEqual(['a4', 'a5', 'a6'])
    // The period no longer claims the games removed.
    expect((await games.loadSync('lichess:alice')).lichess?.blitz).toEqual([
      { from: 3 * DAY + 1, to: 10 * DAY },
    ])
  })

  it('forgets the Chess.com months whose games were recycled', async () => {
    const games = store(2, ['chesscom:alice'])
    const month = (uuid: string, day: number) =>
      toStoredGame('chesscom', 'alice', {
        url: `https://www.chess.com/game/live/${uuid}`,
        uuid,
        time_control: '180',
        time_class: 'blitz',
        rules: 'chess',
        rated: true,
        end_time: Date.UTC(2026, 0, day) / 1000,
        white: { username: 'alice', rating: 1500, result: 'win' },
        black: { username: 'bob', rating: 1500, result: 'resigned' },
        pgn: '1. e4 e5 1-0',
      })!
    await games.put([month('j1', 5), month('j2', 6), { ...month('f1', 40), id: 'f1' }])
    await games.markMonth('chesscom:alice', '2026/01', Date.UTC(2026, 2, 1))
    await games.markMonth('chesscom:alice', '2026/02', Date.UTC(2026, 2, 1))
    await games.touch('chesscom:alice')
    expect(Object.keys((await games.loadSync('chesscom:alice')).chesscomMonths ?? {})).toEqual([
      '2026/02',
    ])
  })

  it('reports its failures as GameStoreError', async () => {
    const broken = createGameStore(() => {
      throw new Error('no IndexedDB')
    })
    await expect(broken.loadSync('lichess:alice')).rejects.toBeInstanceOf(GameStoreError)
  })
})

describe('storedAccounts and clearGameStore', () => {
  it('lists the accounts by games, and clears all but those kept', async () => {
    // These two use the app's database, as the settings do.
    db.close()
    const { database } = await import('@/lib/db')
    const app = database()
    const games = createGameStore(() => app)
    await games.put([stored('a1', 1), stored('a2', 2)])
    await games.put(
      ['b1', 'b2', 'b3'].map((id, index) =>
        toStoredGame('lichess', 'Bob', lichessGame(id, index))!,
      ),
    )
    await games.touch('lichess:alice')
    await games.touch('lichess:bob')
    expect(await storedAccounts()).toEqual([
      { account: 'lichess:bob', games: 3 },
      { account: 'lichess:alice', games: 2 },
    ])
    await clearGameStore(['lichess:alice'])
    expect(await storedAccounts()).toEqual([{ account: 'lichess:alice', games: 2 }])
    await clearGameStore()
    expect(await storedAccounts()).toEqual([])
    db = new AppDatabase()
  })
})
