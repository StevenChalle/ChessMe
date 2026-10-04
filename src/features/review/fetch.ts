import type { Category } from '@/features/player/summary'
import { fetchArchiveGames, fetchArchives } from '@/lib/chesscom/client'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { ApiSource } from '@/lib/http'
import { exportRatedGames, type RatedExportOptions } from '@/lib/lichess/client'
import type { LichessGame } from '@/lib/lichess/types'
import { fromChessComGame, fromLichessGame, latestGames, type ReviewGame } from './games'
import { ALL_RESULTS, matchesSelection, type GameSelection } from './selection'

/**
 * Finds the games of the advanced review: the APIs filter what they can (Lichess: time controls,
 * color, start dates; Chess.com: months), matchesSelection checks everything else.
 */

export type ReviewAccount = { source: ApiSource; username: string }

export type FoundGames = {
  /** Newest first */
  games: ReviewGame[]
  /** Platforms whose games could not be fetched: the others are still reviewed. */
  failures: { source: ApiSource; error: Error }[]
}

export type GameFetchers = {
  lichessExport: (
    username: string,
    options: RatedExportOptions,
    signal?: AbortSignal,
  ) => Promise<LichessGame[]>
  chessComArchives: (username: string, signal?: AbortSignal) => Promise<string[]>
  chessComMonth: (archiveUrl: string, signal?: AbortSignal) => Promise<ChessComGame[]>
}

const API_FETCHERS: GameFetchers = {
  lichessExport: exportRatedGames,
  chessComArchives: fetchArchives,
  chessComMonth: fetchArchiveGames,
}

const LICHESS_PERFS: Record<Category, string[]> = {
  bullet: ['ultraBullet', 'bullet'],
  blitz: ['blitz'],
  rapid: ['rapid'],
  classical: ['classical'],
  daily: ['correspondence'],
}

const DAY = 86_400_000
/** Lichess filters dates on the start of a game: correspondence games can last weeks. */
const CORRESPONDENCE_MARGIN = 60 * DAY
/** Pages of the "latest games" search on Lichess, fetched one after the other. */
const LICHESS_PAGE = 100

async function findLichessGames(
  username: string,
  selection: GameSelection,
  fetchers: GameFetchers,
  signal?: AbortSignal,
): Promise<ReviewGame[]> {
  const base: RatedExportOptions = {
    perfTypes: selection.categories.flatMap((category) => LICHESS_PERFS[category]),
    color: selection.colors.length === 1 ? selection.colors[0] : undefined,
  }
  const keep = (games: LichessGame[]) =>
    games.flatMap((game) => {
      const review = fromLichessGame(game, username)
      return review && matchesSelection(review, selection) ? [review] : []
    })

  const { scope } = selection
  if (scope.kind === 'range') {
    const margin = selection.categories.includes('daily') ? CORRESPONDENCE_MARGIN : DAY
    const games = await fetchers.lichessExport(
      username,
      { ...base, since: scope.from - margin, until: scope.to },
      signal,
    )
    return keep(games)
  }

  // Results and lengths are only checked here: then page backwards until enough games match.
  // Without them, Lichess returns exactly the right games (the quick review asks for 1).
  const filteredHere = selection.results.length < ALL_RESULTS.length || selection.minMoves > 0
  const pageSize = filteredHere ? Math.max(LICHESS_PAGE, scope.count) : scope.count
  const found: ReviewGame[] = []
  let until: number | undefined
  while (found.length < scope.count) {
    const page = await fetchers.lichessExport(username, { ...base, max: pageSize, until }, signal)
    found.push(...keep(page))
    if (page.length < pageSize) break
    until = Math.min(...page.map((game) => game.createdAt)) - 1
  }
  return found
}

/** Year and month of a Chess.com archive URL (…/games/2026/10), as the month's first day. */
function archiveMonth(url: string): { start: number; end: number } | undefined {
  const match = /\/(\d{4})\/(\d{2})$/.exec(url)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  return { start: Date.UTC(year, month, 1), end: Date.UTC(year, month + 1, 1) }
}

async function findChessComGames(
  username: string,
  selection: GameSelection,
  fetchers: GameFetchers,
  signal?: AbortSignal,
): Promise<ReviewGame[]> {
  const { scope } = selection
  let archives = (await fetchers.chessComArchives(username, signal)).toReversed()
  if (scope.kind === 'range') {
    archives = archives.filter((url) => {
      const month = archiveMonth(url)
      // A day of margin for time zones: games are checked on their exact end date anyway.
      return !month || (month.end + DAY > scope.from && month.start - DAY <= scope.to)
    })
  }
  const found: ReviewGame[] = []
  // Newest month first, one request at a time (Chess.com limits parallel requests).
  for (const archive of archives) {
    const month = await fetchers.chessComMonth(archive, signal)
    for (const game of month) {
      const review = fromChessComGame(game, username)
      if (review && matchesSelection(review, selection)) found.push(review)
    }
    if (scope.kind === 'latest' && found.length >= scope.count) break
  }
  return found
}

/**
 * The games of the selection, all platforms together, newest first: the `count` latest, or all
 * those of the date range. Platforms are searched in parallel, each one sequentially.
 */
export async function findGames(
  accounts: ReviewAccount[],
  selection: GameSelection,
  { signal, fetchers = API_FETCHERS }: { signal?: AbortSignal; fetchers?: GameFetchers } = {},
): Promise<FoundGames> {
  const searched = accounts.filter((account) => selection.sources.includes(account.source))
  const results = await Promise.allSettled(
    searched.map(({ source, username }) =>
      source === 'lichess'
        ? findLichessGames(username, selection, fetchers, signal)
        : findChessComGames(username, selection, fetchers, signal),
    ),
  )
  signal?.throwIfAborted()
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [{ source: searched[index]!.source, error: result.reason as Error }]
      : [],
  )
  const all = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const { scope } = selection
  return {
    games: latestGames(all, scope.kind === 'latest' ? scope.count : all.length),
    failures,
  }
}
