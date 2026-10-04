import type { Color } from 'chessops'
import { parsePgn } from 'chessops/pgn'
import type { ChessComGame } from '@/lib/chesscom/types'
import { formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import type { LichessGame } from '@/lib/lichess/types'
import { m } from '@/paraglide/messages'
import { CATEGORIES, type Category } from '@/features/player/summary'
import { toCp } from './errors'

export type GameResult = 'win' | 'draw' | 'loss'

export type TimeControl =
  /** Seconds */
  { kind: 'clock'; initial: number; increment: number } | { kind: 'daily'; days: number }

/** A game of the reviewed player, the same shape for both platforms. */
export type ReviewGame = {
  source: ApiSource
  id: string
  url: string
  /** When the game ended */
  playedAt: Date
  category: Category
  timeControl: TimeControl
  /** The reviewed player's color */
  color: Color
  opponent: { name: string; rating?: number }
  result: GameResult
  sanMoves: string[]
  /** Only for games that did not start from the standard position */
  initialFen?: string
  /**
   * Lichess server analysis, when the game was analysed: White's-side centipawns
   * of the position after each move (index i = after move i + 1).
   */
  serverCps?: (number | undefined)[]
}

// --- Lichess ---

/** Statuses of games that never really took place. */
const LICHESS_UNPLAYED = new Set(['created', 'started', 'aborted', 'noStart', 'unknownFinish'])

const LICHESS_CATEGORIES: Record<string, Category> = {
  ultraBullet: 'bullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classical',
  correspondence: 'daily',
}

/** undefined for games outside the review: unrated, variants, aborted, or without the player. */
export function fromLichessGame(game: LichessGame, username: string): ReviewGame | undefined {
  const category = LICHESS_CATEGORIES[game.speed]
  if (!game.rated || game.variant !== 'standard' || !category) return undefined
  if (LICHESS_UNPLAYED.has(game.status)) return undefined

  const id = username.toLowerCase()
  const color: Color | undefined =
    game.players.white.user?.id === id
      ? 'white'
      : game.players.black.user?.id === id
        ? 'black'
        : undefined
  if (!color) return undefined
  const opponent = game.players[color === 'white' ? 'black' : 'white']

  return {
    source: 'lichess',
    id: game.id,
    url: `https://lichess.org/${game.id}${color === 'black' ? '/black' : ''}`,
    playedAt: new Date(game.lastMoveAt),
    category,
    timeControl: game.clock
      ? { kind: 'clock', initial: game.clock.initial, increment: game.clock.increment }
      : { kind: 'daily', days: game.daysPerTurn ?? 1 },
    color,
    opponent: { name: opponent.user?.name ?? '?', rating: opponent.rating },
    result: !game.winner ? 'draw' : game.winner === color ? 'win' : 'loss',
    sanMoves: game.moves ? game.moves.split(' ') : [],
    initialFen: game.initialFen,
    serverCps: game.analysis?.map((entry) =>
      entry.eval !== undefined
        ? entry.eval
        : entry.mate !== undefined
          ? toCp({ mate: entry.mate })
          : undefined,
    ),
  }
}

// --- Chess.com ---

const CHESSCOM_DRAWS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

/** Rated standard chess with moves: the only games we review. */
export function isReviewableChessComGame(game: ChessComGame): boolean {
  return game.rules === 'chess' && game.rated && Boolean(game.pgn)
}

/** "180+2" / "600" / "1/86400" */
export function parseChessComTimeControl(value: string): TimeControl {
  const [base = '0', increment = '0'] = value.split('+')
  if (base.includes('/')) {
    const seconds = Number(base.split('/')[1])
    return { kind: 'daily', days: Math.max(1, Math.round(seconds / 86_400)) }
  }
  return { kind: 'clock', initial: Number(base), increment: Number(increment) }
}

export function fromChessComGame(game: ChessComGame, username: string): ReviewGame | undefined {
  if (!isReviewableChessComGame(game)) return undefined
  const name = username.toLowerCase()
  const color: Color | undefined =
    game.white.username.toLowerCase() === name
      ? 'white'
      : game.black.username.toLowerCase() === name
        ? 'black'
        : undefined
  if (!color) return undefined
  const player = game[color]
  const opponent = game[color === 'white' ? 'black' : 'white']

  const pgn = parsePgn(game.pgn!)[0]
  const sanMoves = pgn ? [...pgn.moves.mainline()].map((node) => node.san) : []

  return {
    source: 'chesscom',
    id: game.uuid,
    url: game.url,
    playedAt: new Date(game.end_time * 1000),
    category: (CATEGORIES as string[]).includes(game.time_class)
      ? (game.time_class as Category)
      : 'rapid',
    timeControl: parseChessComTimeControl(game.time_control),
    color,
    opponent: { name: opponent.username, rating: opponent.rating },
    result: player.result === 'win' ? 'win' : CHESSCOM_DRAWS.has(player.result) ? 'draw' : 'loss',
    sanMoves,
    initialFen: pgn?.headers.get('SetUp') === '1' ? pgn.headers.get('FEN') : undefined,
  }
}

// --- Both ---

/** The `max` most recent games, all platforms together. */
export function latestGames(games: ReviewGame[], max: number): ReviewGame[] {
  return games.toSorted((a, b) => b.playedAt.getTime() - a.playedAt.getTime()).slice(0, max)
}

const MINUTE_FRACTIONS: Record<number, string> = { 15: '¼', 30: '½', 45: '¾' }

/** "3+2", "½+0", "1.5+1", "3 d" */
export function timeControlLabel(timeControl: TimeControl): string {
  if (timeControl.kind === 'daily') return m.time_control_days({ days: timeControl.days })
  const { initial, increment } = timeControl
  const minutes = MINUTE_FRACTIONS[initial] ?? formatNumber(initial / 60)
  return `${minutes}+${increment}`
}
