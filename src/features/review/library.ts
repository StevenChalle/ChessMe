import type { GameSource } from '@/features/games/normalize'
import { gameStore } from '@/features/games/store'
import {
  findGame,
  findGames,
  type FetchProgress,
  type FoundGames,
  type ReviewAccount,
} from './fetch'
import type { GameRef } from './gameRef'
import { latestGames, type ReviewGame } from './games'
import { matchesSelection, type GameSelection } from './selection'

/**
 * Where the analysis takes its games: the players' online accounts (fetched from the platforms),
 * or a PGN the player imported (already in memory). Never both: a profile is one or the other.
 */
export type GameLibrary = {
  kind: 'accounts' | 'import'
  /** The origins of its games: the "platforms" the filters offer */
  sources: GameSource[]
  /** The games of a selection, newest first, reporting how far the search is */
  find: (
    selection: GameSelection,
    signal: AbortSignal,
    onProgress?: (progress: FetchProgress) => void,
  ) => Promise<FoundGames>
  /** One game, picked in a list */
  findOne: (ref: GameRef, signal: AbortSignal) => Promise<FoundGames>
}

export function accountsLibrary(accounts: ReviewAccount[]): GameLibrary {
  return {
    kind: 'accounts',
    sources: accounts.map((account) => account.source),
    // Games already fetched are kept: only what is missing is asked for (docs/game-store.md).
    find: (selection, signal, onProgress) =>
      findGames(accounts, selection, { signal, onProgress, store: gameStore }),
    findOne: (ref, signal) => findGame(accounts, ref, { signal }),
  }
}

/** Imported games: the selection is applied here, as the platforms' APIs would. */
export function importLibrary(games: ReviewGame[]): GameLibrary {
  return {
    kind: 'import',
    sources: ['import'],
    find: async (selection) => {
      const kept = games.filter((game) => matchesSelection(game, selection))
      const { scope } = selection
      const max = scope.kind === 'latest' ? scope.count : (scope.max ?? kept.length)
      return { games: latestGames(kept, max), failures: [] }
    },
    findOne: async (ref) => ({
      games: games.filter((game) => ref.source === 'import' && game.id === ref.id),
      failures: [],
    }),
  }
}
