import type { Color } from 'chessops'
import type { ChessComGame } from '@/lib/chesscom/types'
import { formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import type { LichessGame } from '@/lib/lichess/types'
import { m } from '@/paraglide/messages'
import { CATEGORIES, type Category } from '@/features/player/summary'

/**
 * A game seen from one player's side, the same shape for both platforms: what a table of games
 * shows. The review (moves, evaluations) and the history (ratings) build on it.
 */

export type GameResult = 'win' | 'draw' | 'loss'

export type TimeControl =
  /** Seconds */
  { kind: 'clock'; initial: number; increment: number } | { kind: 'daily'; days: number }

export type GameSummary = {
  source: ApiSource
  id: string
  url: string
  /** When the game ended */
  playedAt: Date
  category: Category
  timeControl: TimeControl
  rated: boolean
  /** Undefined for standard chess; otherwise the platform's variant key (chess960, crazyhouse…) */
  variant?: string
  /** The player's color */
  color: Color
  /** The player's rating after the game (rated games), when known */
  rating?: number
  /** Rating won or lost in this game, when the platform says so (Lichess) */
  ratingDiff?: number
  opponent: { name: string; rating?: number }
  result: GameResult
}

/**
 * The games ChessMe works with, in the review as in the history: standard chess, rated or casual
 * (no variants). The review can then keep only rated or only casual games (selection.ts).
 */
export function isStandardGame(game: GameSummary): boolean {
  return game.variant === undefined
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

/** undefined for games that never took place or without the player. */
export function summarizeLichessGame(game: LichessGame, username: string): GameSummary | undefined {
  const category = LICHESS_CATEGORIES[game.speed]
  if (!category || LICHESS_UNPLAYED.has(game.status)) return undefined

  const id = username.toLowerCase()
  const color: Color | undefined =
    game.players.white.user?.id === id
      ? 'white'
      : game.players.black.user?.id === id
        ? 'black'
        : undefined
  if (!color) return undefined
  const player = game.players[color]
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
    rated: game.rated,
    variant: game.variant === 'standard' ? undefined : game.variant,
    color,
    // Lichess gives the rating before the game, and the change.
    rating:
      game.rated && player.rating !== undefined
        ? player.rating + (player.ratingDiff ?? 0)
        : undefined,
    ratingDiff: game.rated ? player.ratingDiff : undefined,
    // Games against the computer have no opponent account, only its level.
    opponent: {
      name:
        opponent.user?.name ??
        (opponent.aiLevel !== undefined ? m.ai_opponent({ level: opponent.aiLevel }) : '?'),
      rating: opponent.rating,
    },
    result: !game.winner ? 'draw' : game.winner === color ? 'win' : 'loss',
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

/** "180+2" / "600" / "1/86400" */
export function parseChessComTimeControl(value: string): TimeControl {
  const [base = '0', increment = '0'] = value.split('+')
  if (base.includes('/')) {
    const seconds = Number(base.split('/')[1])
    return { kind: 'daily', days: Math.max(1, Math.round(seconds / 86_400)) }
  }
  return { kind: 'clock', initial: Number(base), increment: Number(increment) }
}

/** undefined for games without the player. */
export function summarizeChessComGame(
  game: ChessComGame,
  username: string,
): GameSummary | undefined {
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

  return {
    source: 'chesscom',
    id: game.uuid,
    url: game.url,
    playedAt: new Date(game.end_time * 1000),
    category: (CATEGORIES as string[]).includes(game.time_class)
      ? (game.time_class as Category)
      : 'rapid',
    timeControl: parseChessComTimeControl(game.time_control),
    rated: game.rated,
    variant: game.rules === 'chess' ? undefined : game.rules,
    color,
    // Chess.com gives the rating after the game, not the change (see the history feed).
    rating: game.rated ? player.rating : undefined,
    opponent: { name: opponent.username, rating: opponent.rating },
    result: player.result === 'win' ? 'win' : CHESSCOM_DRAWS.has(player.result) ? 'draw' : 'loss',
  }
}

// --- Both ---

/** Newest first. */
export function byNewest(a: GameSummary, b: GameSummary): number {
  return b.playedAt.getTime() - a.playedAt.getTime()
}

const MINUTE_FRACTIONS: Record<number, string> = { 15: '¼', 30: '½', 45: '¾' }

/** "3+2", "½+0", "1.5+1", "3 d" */
export function timeControlLabel(timeControl: TimeControl): string {
  if (timeControl.kind === 'daily') return m.time_control_days({ days: timeControl.days })
  const { initial, increment } = timeControl
  const minutes = MINUTE_FRACTIONS[initial] ?? formatNumber(initial / 60)
  return `${minutes}+${increment}`
}

/** Platform variant keys, shown as their usual names (proper names, not translated). */
const VARIANT_NAMES: Record<string, string> = {
  chess960: 'Chess960',
  crazyhouse: 'Crazyhouse',
  antichess: 'Antichess',
  atomic: 'Atomic',
  horde: 'Horde',
  kingOfTheHill: 'King of the Hill',
  kingofthehill: 'King of the Hill',
  racingKings: 'Racing Kings',
  threeCheck: 'Three-check',
  threecheck: 'Three-check',
  bughouse: 'Bughouse',
}

export function variantLabel(variant: string): string {
  if (variant === 'fromPosition') return m.variant_from_position()
  return VARIANT_NAMES[variant] ?? variant
}
