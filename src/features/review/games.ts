import { parsePgn } from 'chessops/pgn'
import {
  summarizeChessComGame,
  summarizeLichessGame,
  type GameSummary,
} from '@/features/games/normalize'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { LichessGame } from '@/lib/lichess/types'
import { toCp } from './errors'

/** A game of the reviewed player, with what the analysis needs. */
export type ReviewGame = GameSummary & {
  sanMoves: string[]
  /** Only for games that did not start from the standard position */
  initialFen?: string
  /**
   * Lichess server analysis, when the game was analysed: White's-side centipawns
   * of the position after each move (index i = after move i + 1).
   */
  serverCps?: (number | undefined)[]
}

/** undefined for games outside the review: unrated, variants, aborted, or without the player. */
export function fromLichessGame(game: LichessGame, username: string): ReviewGame | undefined {
  const summary = summarizeLichessGame(game, username)
  if (!summary || !summary.rated || summary.variant) return undefined
  return {
    ...summary,
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

/** Rated standard chess with moves: the only games we review. */
export function isReviewableChessComGame(game: ChessComGame): boolean {
  return game.rules === 'chess' && game.rated && Boolean(game.pgn)
}

export function fromChessComGame(game: ChessComGame, username: string): ReviewGame | undefined {
  if (!isReviewableChessComGame(game)) return undefined
  const summary = summarizeChessComGame(game, username)
  if (!summary) return undefined
  const pgn = parsePgn(game.pgn!)[0]
  return {
    ...summary,
    sanMoves: pgn ? [...pgn.moves.mainline()].map((node) => node.san) : [],
    initialFen: pgn?.headers.get('SetUp') === '1' ? pgn.headers.get('FEN') : undefined,
  }
}

/** The `max` most recent games, all platforms together. */
export function latestGames<G extends GameSummary>(games: G[], max: number): G[] {
  return games.toSorted((a, b) => b.playedAt.getTime() - a.playedAt.getTime()).slice(0, max)
}
