import type { GameCategory } from '@/features/games/normalize'
import { archiveUrl, fetchArchiveGames, fetchArchives } from '@/lib/chesscom/client'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { ApiSource } from '@/lib/http'
import { exportGame, exportStandardGames, type GameExportOptions } from '@/lib/lichess/client'
import type { LichessGame } from '@/lib/lichess/types'
import type { GameRef } from './gameRef'
import { fromChessComGame, fromLichessGame, latestGames, type ReviewGame } from './games'
import { activeRatingFilter, ALL_RESULTS, matchesSelection, type GameSelection } from './selection'

/**
 * Finds the games of the advanced review: the APIs filter what they can (Lichess: time controls,
 * rated or casual, color, start dates; Chess.com: months), matchesSelection checks everything else.
 */

export type ReviewAccount = { source: ApiSource; username: string }

export type FoundGames = {
  /** Newest first */
  games: ReviewGame[]
  /** Platforms whose games could not be fetched: the others are still reviewed. */
  failures: { source: ApiSource; error: Error }[]
}

/**
 * How far the search of each platform is: games found so far (matching the filters) and the share
 * of the work done (0 to 1), from the games wanted, the period covered or the months read.
 */
export type FetchProgress = Partial<Record<ApiSource, { games: number; ratio: number }>>

type Report = (games: number, ratio: number) => void

export type GameFetchers = {
  lichessExport: (
    username: string,
    options: GameExportOptions,
    signal?: AbortSignal,
    onGame?: (game: LichessGame) => void,
  ) => Promise<LichessGame[]>
  chessComArchives: (username: string, signal?: AbortSignal) => Promise<string[]>
  chessComMonth: (archiveUrl: string, signal?: AbortSignal) => Promise<ChessComGame[]>
}

const API_FETCHERS: GameFetchers = {
  lichessExport: exportStandardGames,
  chessComArchives: fetchArchives,
  chessComMonth: fetchArchiveGames,
}

const LICHESS_PERFS: Record<GameCategory, string[]> = {
  bullet: ['ultraBullet', 'bullet'],
  blitz: ['blitz'],
  rapid: ['rapid'],
  classical: ['classical'],
  daily: ['correspondence'],
  // Only imported games have no time control
  unknown: [],
}

const DAY = 86_400_000
/** Lichess filters dates on the start of a game: correspondence games can last weeks. */
const CORRESPONDENCE_MARGIN = 60 * DAY
/** Pages of the "latest games" search on Lichess, fetched one after the other. */
const LICHESS_PAGE = 100

const share = (done: number, total: number) =>
  total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0

async function findLichessGames(
  username: string,
  selection: GameSelection,
  fetchers: GameFetchers,
  report: Report,
  signal?: AbortSignal,
): Promise<ReviewGame[]> {
  const base: GameExportOptions = {
    perfTypes: selection.categories.flatMap((category) => LICHESS_PERFS[category]),
    color: selection.colors.length === 1 ? selection.colors[0] : undefined,
    rated: selection.ratings.length === 1 ? selection.ratings[0] === 'rated' : undefined,
  }
  const keep = (games: LichessGame[]) =>
    games.flatMap((game) => {
      const review = fromLichessGame(game, username)
      return review && matchesSelection(review, selection) ? [review] : []
    })

  const { scope } = selection
  const limit = scope.kind === 'latest' ? scope.count : scope.max
  let since: number | undefined
  let until: number | undefined
  if (scope.kind === 'range') {
    const margin = selection.categories.includes('daily') ? CORRESPONDENCE_MARGIN : DAY
    since = scope.from - margin
    until = scope.to
  }
  // Games stream in newest first: the share of the period covered, or of the games wanted.
  const end = until
  const progress = (found: number, game: LichessGame) =>
    Math.max(
      limit === undefined ? 0 : share(found, limit),
      since === undefined || end === undefined ? 0 : share(end - game.createdAt, end - since),
    )
  let streamed = 0
  const onGame = (base: number) => (game: LichessGame) => {
    streamed += keep([game]).length
    report(base + streamed, progress(base + streamed, game))
  }

  // A whole date range, in one request.
  if (limit === undefined) {
    const games = keep(
      await fetchers.lichessExport(username, { ...base, since, until }, signal, onGame(0)),
    )
    report(games.length, 1)
    return games
  }

  // Results, opponent ratings and end dates are only checked here: then page backwards until enough games
  // match. Without them, Lichess returns exactly the right games (the quick review asks for 1).
  const filteredHere =
    scope.kind === 'range' ||
    selection.results.length < ALL_RESULTS.length ||
    activeRatingFilter(selection) !== undefined
  const pageSize = filteredHere ? Math.max(LICHESS_PAGE, limit) : limit
  const found: ReviewGame[] = []
  while (found.length < limit) {
    streamed = 0
    const page = await fetchers.lichessExport(
      username,
      { ...base, max: pageSize, since, until },
      signal,
      onGame(found.length),
    )
    found.push(...keep(page))
    if (page.length < pageSize) break
    until = Math.min(...page.map((game) => game.createdAt)) - 1
  }
  report(found.length, 1)
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
  report: Report,
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
  const limit = scope.kind === 'latest' ? scope.count : scope.max
  report(0, 0)
  // Newest month first, one request at a time (Chess.com limits parallel requests).
  for (const [index, archive] of archives.entries()) {
    const month = await fetchers.chessComMonth(archive, signal)
    for (const game of month) {
      const review = fromChessComGame(game, username)
      if (review && matchesSelection(review, selection)) found.push(review)
    }
    if (limit !== undefined && found.length >= limit) break
    report(
      found.length,
      Math.max(
        limit === undefined ? 0 : share(found.length, limit),
        share(index + 1, archives.length),
      ),
    )
  }
  report(found.length, 1)
  return found
}

/**
 * The games of the selection, all platforms together, newest first: the `count` latest, or those
 * of the date range (the `max` latest, if set). Platforms are searched in parallel, each one sequentially.
 */
export async function findGames(
  accounts: ReviewAccount[],
  selection: GameSelection,
  {
    signal,
    fetchers = API_FETCHERS,
    onProgress,
  }: {
    signal?: AbortSignal
    fetchers?: GameFetchers
    /** Called as games arrive, with every platform's progress so far */
    onProgress?: (progress: FetchProgress) => void
  } = {},
): Promise<FoundGames> {
  const searched = accounts.filter((account) => selection.sources.includes(account.source))
  let progress: FetchProgress = Object.fromEntries(
    searched.map(({ source }) => [source, { games: 0, ratio: 0 }]),
  )
  const reporter =
    (source: ApiSource): Report =>
    (games, ratio) => {
      if (signal?.aborted) return
      progress = { ...progress, [source]: { games, ratio } }
      onProgress?.(progress)
    }
  const results = await Promise.allSettled(
    searched.map(({ source, username }) =>
      source === 'lichess'
        ? findLichessGames(username, selection, fetchers, reporter(source), signal)
        : findChessComGames(username, selection, fetchers, reporter(source), signal),
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
    games: latestGames(all, (scope.kind === 'latest' ? scope.count : scope.max) ?? all.length),
    failures,
  }
}

export type SingleGameFetchers = {
  lichessGame: (id: string, signal?: AbortSignal) => Promise<LichessGame | undefined>
  chessComMonth: (archiveUrl: string, signal?: AbortSignal) => Promise<ChessComGame[]>
}

const SINGLE_GAME_FETCHERS: SingleGameFetchers = {
  lichessGame: exportGame,
  chessComMonth: fetchArchiveGames,
}

/**
 * One game picked in a list (the history), to analyse on its own: no game when it is not one of
 * the accounts' standard games (or no longer found).
 */
export async function findGame(
  accounts: ReviewAccount[],
  ref: GameRef,
  {
    signal,
    fetchers = SINGLE_GAME_FETCHERS,
  }: { signal?: AbortSignal; fetchers?: SingleGameFetchers } = {},
): Promise<FoundGames> {
  // Imported games are not fetched (see library.ts).
  if (ref.source === 'import') return { games: [], failures: [] }
  const source = ref.source
  const account = accounts.find((item) => item.source === source)
  if (!account) return { games: [], failures: [] }
  try {
    let game: ReviewGame | undefined
    if (ref.source === 'lichess') {
      const raw = await fetchers.lichessGame(ref.id, signal)
      game = raw && fromLichessGame(raw, account.username)
    } else {
      const month = await fetchers.chessComMonth(
        archiveUrl(account.username, ref.year, ref.month),
        signal,
      )
      const raw = month.find((item) => item.uuid === ref.id)
      game = raw && fromChessComGame(raw, account.username)
    }
    return { games: game ? [game] : [], failures: [] }
  } catch (error) {
    signal?.throwIfAborted()
    return { games: [], failures: [{ source, error: error as Error }] }
  }
}
