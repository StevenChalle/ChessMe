import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDatabase, DB_NAME } from '@/lib/db'
import { ENGINE_ID } from '@/lib/engine/stockfish'
import Dexie from 'dexie'
import {
  cacheWriter,
  createCache,
  movesHash,
  positionKey,
  type CacheEntry,
  type EvaluationCache,
} from './cache'
import type { ReviewGame } from './games'
import { replay } from './positions'

const RECIPE = { version: 1, engine: ENGINE_ID, quickNodes: 100_000, deepNodes: 1_000_000 }

const entry = (key: string, nodes: number, cp = 20): CacheEntry => ({
  key,
  score: { cp },
  bestMove: 'e2e4',
  nodes,
})

const game = (id: string, sanMoves: string[], source = 'lichess') =>
  ({
    source,
    id,
    playedAt: new Date(1000),
    sanMoves,
  }) as unknown as ReviewGame

let db: AppDatabase
let time: number
let cache: EvaluationCache

beforeEach(async () => {
  await Dexie.delete(DB_NAME)
  db = new AppDatabase()
  time = 1_000_000
  cache = createCache(
    () => db,
    () => time,
  )
})

afterEach(() => db.close())

describe('positionKey', () => {
  it('drops the move counters', () => {
    expect(positionKey('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    )
  })

  it('gives transpositions the same key', () => {
    const a = replay(['Nf3', 'Nf6', 'g3', 'g6']).at(-1)!
    const b = replay(['g3', 'g6', 'Nf3', 'Nf6']).at(-1)!
    expect(positionKey(a.fen)).toBe(positionKey(b.fen))
  })

  it('keeps the en passant square only when the capture is possible', () => {
    // After 1. e4 no black pawn can take: no square. After 1. e4 d5 2. e5 f5, exf6 is legal.
    expect(positionKey(replay(['e4']).at(-1)!.fen).endsWith(' -')).toBe(true)
    expect(positionKey(replay(['e4', 'd5', 'e5', 'f5']).at(-1)!.fen).endsWith(' f6')).toBe(true)
  })
})

describe('movesHash', () => {
  it('depends on the moves and the starting position', () => {
    const hash = movesHash(['e4', 'e5'])
    expect(movesHash(['e4', 'e5'])).toBe(hash)
    expect(movesHash(['e4', 'c5'])).not.toBe(hash)
    expect(movesHash(['e4', 'e5'], '8/8/8/8/8/8/8/K6k w - - 0 1')).not.toBe(hash)
  })
})

describe('createCache', () => {
  it('finds what was stored, for the current engine only', async () => {
    await cache.store([entry('a', 100_000, 35)])
    await db.positions.put({
      ...(await db.positions.get(['a', ENGINE_ID]))!,
      key: 'b',
      engine: 'old',
    })
    const found = await cache.lookup(['a', 'b', 'c'])
    expect([...found.keys()]).toEqual(['a'])
    expect(found.get('a')).toEqual({ score: { cp: 35 }, bestMove: 'e2e4', nodes: 100_000 })
  })

  it('keeps the deepest evaluation of a position', async () => {
    await cache.store([entry('a', 1_000_000, 50), entry('a', 100_000, 10)])
    await cache.store([entry('a', 100_000, 99)])
    expect((await cache.lookup(['a'])).get('a')).toMatchObject({
      nodes: 1_000_000,
      score: { cp: 50 },
    })
    await cache.store([entry('b', 100_000, 10)])
    await cache.store([entry('b', 1_000_000, 70)])
    expect((await cache.lookup(['b'])).get('b')).toMatchObject({
      nodes: 1_000_000,
      score: { cp: 70 },
    })
  })

  it('refreshes the date of a position read more than a day later', async () => {
    await cache.store([entry('a', 100_000)])
    time += 1000
    await cache.lookup(['a'])
    expect((await db.positions.get(['a', ENGINE_ID]))!.usedAt).toBe(1_000_000)
    time += 2 * 24 * 60 * 60 * 1000
    await cache.lookup(['a'])
    expect((await db.positions.get(['a', ENGINE_ID]))!.usedAt).toBe(time)
  })

  it('saves games once by moves, with every reference', async () => {
    await cache.saveGames([game('g1', ['e4', 'e5']), game('x', [])], RECIPE)
    await cache.saveGames([game('i1', ['e4', 'e5'], 'import'), game('g1', ['e4', 'e5'])], RECIPE)
    const rows = await db.games.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      hash: movesHash(['e4', 'e5']),
      refs: ['lichess:g1', 'import:i1'],
      sanMoves: ['e4', 'e5'],
      playedAt: 1000,
      analysis: RECIPE,
    })
    expect(await db.games.where('refs').equals('import:i1').count()).toBe(1)
  })

  it('makes room for the new positions above the limit, the least recently used first', async () => {
    const limited = createCache(
      () => db,
      () => time,
      { positions: 8, analysedGames: 100, storedGames: 100 },
    )
    const rows = Array.from({ length: 10 }, (_, index) => ({
      key: `p${index}`,
      engine: ENGINE_ID,
      score: { cp: 0 },
      bestMove: 'e2e4',
      nodes: 100_000,
      usedAt: index,
    }))
    await db.positions.bulkPut(rows)
    // A new evaluation comes in: down to 90 % of the limit, the oldest go.
    await limited.store([entry('new', 100_000)])
    const kept = (await db.positions.toArray()).map((row) => row.key).toSorted()
    expect(kept).toEqual(['new', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'])
  })

  it('never throws when IndexedDB fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = createCache(() => {
      throw new Error('no IndexedDB')
    })
    await expect(broken.store([entry('a', 1)])).resolves.toBeUndefined()
    await expect(broken.lookup(['a'])).resolves.toEqual(new Map())
    await expect(broken.saveGames([game('g1', ['e4'])], RECIPE)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('cacheWriter', () => {
  it('stores in batches, and everything left on flush', async () => {
    vi.useFakeTimers()
    const store = vi.fn<EvaluationCache['store']>(async () => {})
    const writer = cacheWriter({ ...cache, store }, 1000)
    writer.add(entry('a', 1))
    writer.add(entry('b', 1))
    expect(store).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(store).toHaveBeenCalledWith([entry('a', 1), entry('b', 1)])
    writer.add(entry('c', 1))
    await writer.flush()
    expect(store).toHaveBeenLastCalledWith([entry('c', 1)])
    await vi.advanceTimersByTimeAsync(2000)
    expect(store).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
