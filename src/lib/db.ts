import Dexie, { type Table } from 'dexie'
import type { GameSummary } from '@/features/games/normalize'
import type { Period } from '@/features/games/periods'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { EngineScore } from '@/lib/engine/uci'
import type { LichessGame } from '@/lib/lichess/types'

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

/** A game of an account, as the platform's API gives it (see docs/game-store.md). */
export type StoredGame = {
  /** 'lichess:alice': the platform and the lowercase username */
  account: string
  /** Lichess id, or Chess.com uuid */
  id: string
  /** End of the game (ms): the order of the lists */
  playedAt: number
  /** Lichess only: start of the game (ms), the date the API filters on */
  createdAt?: number
  /** The game seen from the account's side, to filter without parsing the moves */
  summary: GameSummary
  /** Rules `summary` was made with: recomputed from `raw` when they change */
  summaryVersion: number
  raw: LichessGame | ChessComGame
}

/** What is known of an account's games. */
export type AccountSync = {
  account: string
  /** Lichess: per perf (bullet, blitz…), the periods whose games are all stored (createdAt, ms) */
  lichess?: Record<string, Period[]>
  /** Chess.com: when each month ('2026/10') was read (ms) */
  chesscomMonths?: Record<string, number>
  /** Last search on this account (ms), for eviction */
  usedAt: number
}

export class AppDatabase extends Dexie {
  positions!: Table<CachedPosition, [string, string]>
  games!: Table<CachedGame, string>
  accountGames!: Table<StoredGame, [string, string]>
  accountSync!: Table<AccountSync, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      positions: '[key+engine], usedAt',
      games: 'hash, *refs, usedAt',
    })
    // The accounts' games (docs/game-store.md).
    this.version(2).stores({
      accountGames: '[account+id], [account+playedAt]',
      accountSync: 'account, usedAt',
    })
    // The oldest games of all accounts, to recycle them once the limit is reached.
    this.version(3).stores({
      accountGames: '[account+id], [account+playedAt], playedAt',
    })
  }
}

let instance: AppDatabase | undefined
/** Deleted by the player: not opened again before the page reloads */
let deleted = false

/**
 * Opened on first use only: pages that never need it do not touch IndexedDB. Throws once the
 * local data was deleted: a background analysis still finishing must not create it again (the
 * cache and the game store fail silently).
 */
export function database(): AppDatabase {
  if (deleted) throw new Error('Local data deleted: reload the page to store again')
  instance ??= new AppDatabase()
  return instance
}

/** Deletes the whole database, for the rest of this page's life. Rejects if IndexedDB is unavailable. */
export async function deleteDatabase(): Promise<void> {
  deleted = true
  instance?.close()
  instance = undefined
  await Dexie.delete(DB_NAME)
}
