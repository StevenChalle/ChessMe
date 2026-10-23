import type { Table } from 'dexie'
import { database, type AppDatabase, type CachedGame, type CachedPosition } from '@/lib/db'
import { ENGINE_ID } from '@/lib/engine/stockfish'
import type { EngineScore } from '@/lib/engine/uci'
import { gameRef } from './gameRef'
import type { ReviewGame } from './games'

/**
 * Every evaluation Stockfish made, kept in the browser (IndexedDB) by position, so that analysing
 * games again is instant and each search serves every game going through the same position.
 * Only evaluations are kept: errors are judged again with the criteria of the moment.
 * A cache, not a backup: the browser may delete it, and every failure here is silent (the
 * analysis goes on without it). Design: docs/analysis-cache.md.
 */

export type CachedEvaluation = {
  /** From the side to move */
  score: EngineScore
  bestMove: string
  /** Search budget */
  nodes: number
}

export type CacheEntry = CachedEvaluation & { key: string }

export type AnalysisRecipe = CachedGame['analysis']

export type EvaluationCache = {
  /** The current engine's evaluation of each of these positions (positionKey) it knows. */
  lookup: (keys: string[]) => Promise<Map<string, CachedEvaluation>>
  /** Keeps these evaluations: for each position, the deepest one wins. */
  store: (entries: CacheEntry[]) => Promise<void>
  /** Remembers that these games were analysed, and how. */
  saveGames: (games: ReviewGame[], recipe: AnalysisRecipe) => Promise<void>
}

/** About 500 MB: tens of thousands of games, more than most players ever play. */
export const MAX_POSITIONS = 2_000_000
export const MAX_GAMES = 50_000

/** Reading a position refreshes its date at most once a day, so reads rarely write. */
const REFRESH_MS = 24 * 60 * 60 * 1000

/**
 * The position without its move counters, so that the same position reached in two ways has the
 * same key. chessops only writes the en passant square when the capture is legal.
 */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

/** Identifies a game by its starting position and moves (cyrb53: 53 bits, in base 36). */
export function movesHash(sanMoves: string[], initialFen?: string): string {
  const text = `${initialFen ?? 'startpos'}|${sanMoves.join(' ')}`
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function isQuotaError(error: unknown): boolean {
  const named = (value: unknown) =>
    typeof value === 'object' && value !== null && 'name' in value && value.name
  const inner = typeof error === 'object' && error !== null && 'inner' in error && error.inner
  return named(error) === 'QuotaExceededError' || named(inner) === 'QuotaExceededError'
}

/**
 * Deletes the least recently used rows above `max`, down to 90 % of it. With `force` (the disk
 * is full), a fifth of the rows go whatever their number.
 */
async function trimTable<Row, Key>(table: Table<Row, Key>, max: number, force: boolean) {
  const count = await table.count()
  const target = force ? Math.floor(count * 0.8) : count > max ? Math.floor(max * 0.9) : count
  if (count <= target) return
  const keys = await table
    .orderBy('usedAt')
    .limit(count - target)
    .primaryKeys()
  await table.bulkDelete(keys)
}

async function trim(db: AppDatabase, force = false): Promise<void> {
  await trimTable(db.positions, MAX_POSITIONS, force)
  await trimTable(db.games, MAX_GAMES, force)
}

/** Asks the browser not to delete the cache when space runs low (granted or not, silently). */
async function requestPersistence(): Promise<void> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage?.persist || (await storage.persisted())) return
  await storage.persist()
}

export function createCache(
  getDatabase: () => AppDatabase,
  now: () => number = Date.now,
): EvaluationCache {
  let warned = false
  let persistenceAsked = false
  const warn = (error: unknown) => {
    if (warned) return
    warned = true
    console.warn('Analysis cache unavailable', error)
  }

  const writePositions = (db: AppDatabase, entries: CacheEntry[]) =>
    db.transaction('rw', db.positions, async () => {
      const existing = await db.positions.bulkGet(
        entries.map((entry): [string, string] => [entry.key, ENGINE_ID]),
      )
      const time = now()
      const rows: CachedPosition[] = entries
        .filter((entry, index) => (existing[index]?.nodes ?? -1) < entry.nodes)
        .map(({ key, score, bestMove, nodes }) => ({
          key,
          engine: ENGINE_ID,
          score,
          bestMove,
          nodes,
          usedAt: time,
        }))
      if (rows.length > 0) await db.positions.bulkPut(rows)
    })

  return {
    async lookup(keys) {
      const found = new Map<string, CachedEvaluation>()
      const unique = [...new Set(keys)]
      if (unique.length === 0) return found
      try {
        const db = getDatabase()
        const rows = await db.positions.bulkGet(
          unique.map((key): [string, string] => [key, ENGINE_ID]),
        )
        const time = now()
        const stale: [string, string][] = []
        for (const row of rows) {
          if (!row) continue
          found.set(row.key, { score: row.score, bestMove: row.bestMove, nodes: row.nodes })
          if (time - row.usedAt > REFRESH_MS) stale.push([row.key, row.engine])
        }
        if (stale.length > 0) {
          await db.positions.bulkUpdate(stale.map((key) => ({ key, changes: { usedAt: time } })))
        }
      } catch (error) {
        warn(error)
      }
      return found
    },

    async store(entries) {
      if (entries.length === 0) return
      const deepest = new Map<string, CacheEntry>()
      for (const entry of entries) {
        if ((deepest.get(entry.key)?.nodes ?? -1) < entry.nodes) deepest.set(entry.key, entry)
      }
      try {
        const db = getDatabase()
        try {
          await writePositions(db, [...deepest.values()])
        } catch (error) {
          if (!isQuotaError(error)) throw error
          await trim(db, true)
          await writePositions(db, [...deepest.values()])
        }
        if (!persistenceAsked) {
          persistenceAsked = true
          await requestPersistence()
        }
      } catch (error) {
        warn(error)
      }
    },

    async saveGames(games, recipe) {
      const played = games.filter((game) => game.sanMoves.length > 0)
      if (played.length === 0) return
      try {
        const db = getDatabase()
        await db.transaction('rw', db.games, async () => {
          const hashes = played.map((game) => movesHash(game.sanMoves, game.initialFen))
          const existing = await db.games.bulkGet(hashes)
          const time = now()
          const rows = new Map<string, CachedGame>()
          played.forEach((game, index) => {
            const hash = hashes[index]!
            const previous = rows.get(hash) ?? existing[index]
            const ref = gameRef(game)
            rows.set(hash, {
              hash,
              refs: previous?.refs.includes(ref) ? previous.refs : [...(previous?.refs ?? []), ref],
              ...(game.initialFen && { initialFen: game.initialFen }),
              sanMoves: game.sanMoves,
              playedAt: game.playedAt.getTime(),
              analysis: recipe,
              usedAt: time,
            })
          })
          await db.games.bulkPut([...rows.values()])
        })
        await trim(db)
      } catch (error) {
        warn(error)
      }
    },
  }
}

/** The browser's cache, used by the analysis. */
export const analysisCache = createCache(database)

/**
 * Collects evaluations as an analysis makes them and stores them in batches (`delayMs` after the
 * first one), rather than one write per position. `flush` stores what is left: call it at the end,
 * aborted or not, so that nothing computed is lost.
 */
export function cacheWriter(cache: EvaluationCache, delayMs = 1000) {
  let pending: CacheEntry[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let writing = Promise.resolve()
  const flush = (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    if (pending.length > 0) {
      const batch = pending
      pending = []
      writing = writing.then(() => cache.store(batch))
    }
    return writing
  }
  return {
    add(entry: CacheEntry) {
      pending.push(entry)
      timer ??= setTimeout(() => void flush(), delayMs)
    },
    flush,
  }
}

/**
 * The games (movesHash) analysed with this recipe or a later one by the same engine: the background
 * analysis skips them. Empty when IndexedDB is unavailable (everything looks to do: the positions
 * are still found in the cache, if it works).
 */
export async function analysedGames(
  hashes: string[],
  recipe: AnalysisRecipe,
): Promise<Set<string>> {
  try {
    const rows = await database().games.bulkGet(hashes)
    return new Set(
      rows.flatMap((row) =>
        row && row.analysis.engine === recipe.engine && row.analysis.version >= recipe.version
          ? [row.hash]
          : [],
      ),
    )
  } catch {
    return new Set()
  }
}

/** What the cache holds, for the settings. Undefined when IndexedDB is unavailable. */
export async function analysisCacheStats(): Promise<
  { games: number; positions: number } | undefined
> {
  try {
    const db = database()
    return { games: await db.games.count(), positions: await db.positions.count() }
  } catch {
    return undefined
  }
}

/** Empties the cache (the other data of the database stays). */
export async function clearAnalysisCache(): Promise<boolean> {
  try {
    const db = database()
    await db.transaction('rw', db.positions, db.games, async () => {
      await db.positions.clear()
      await db.games.clear()
    })
    return true
  } catch {
    return false
  }
}
