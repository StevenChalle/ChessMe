import Dexie, { type Table } from 'dexie'
import type { EngineScore } from '@/lib/engine/uci'

/**
 * The app's IndexedDB database. Declared on the /legal page; deleted by clearLocalData().
 * Every change of structure is a new db.version(n), with an upgrade if needed: never delete the
 * database from the code to change it.
 */
export const DB_NAME = 'craftyourchess'

/** One engine evaluation of a position (see docs/analysis-cache.md). */
export type CachedPosition = {
  /** Normalized FEN: positionKey() */
  key: string
  /** The engine that produced it: ENGINE_ID */
  engine: string
  /** From the side to move, as the engine gives it */
  score: EngineScore
  /** UCI, castling as the king move (e1g1) */
  bestMove: string
  /** Search budget */
  nodes: number
  /** Last time it was read or written (ms), for eviction */
  usedAt: number
}

/** A game whose positions were evaluated. */
export type CachedGame = {
  /** movesHash(): the starting position and the moves */
  hash: string
  /** Where it comes from, as gameRef() writes it: several when the same game came twice */
  refs: string[]
  initialFen?: string
  sanMoves: string[]
  /** ms */
  playedAt: number
  /** How it was analysed last */
  analysis: { version: number; engine: string; quickNodes: number; deepNodes: number }
  usedAt: number
}

export class AppDatabase extends Dexie {
  positions!: Table<CachedPosition, [string, string]>
  games!: Table<CachedGame, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      positions: '[key+engine], usedAt',
      games: 'hash, *refs, usedAt',
    })
  }
}

let instance: AppDatabase | undefined

/** Opened on first use only: pages that never need it do not touch IndexedDB. */
export function database(): AppDatabase {
  instance ??= new AppDatabase()
  return instance
}

/** Deletes the whole database. Rejects if IndexedDB is unavailable. */
export async function deleteDatabase(): Promise<void> {
  instance?.close()
  instance = undefined
  await Dexie.delete(DB_NAME)
}
