/** Subset of the Chess.com Published-Data API. https://www.chess.com/news/view/published-data-api */

export type ChessComProfile = {
  player_id: number
  username: string
  /** Profile URL, which carries the username's display casing */
  url: string
  name?: string
  title?: string
  avatar?: string
  /** API URL ending with the ISO country code, e.g. https://api.chess.com/pub/country/FR */
  country?: string
  location?: string
  /** Unix seconds */
  joined?: number
  /** Unix seconds */
  last_online?: number
  followers?: number
  /** basic, premium, staff, closed, closed:fair_play_violations... */
  status?: string
  league?: string
  is_streamer?: boolean
}

export type ChessComRecord = {
  win: number
  loss: number
  draw: number
}

export type ChessComCategoryStats = {
  /** date is in Unix seconds */
  last?: { rating: number; date: number; rd: number }
  best?: { rating: number; date: number; game: string }
  record?: ChessComRecord
}

export type ChessComCategoryKey =
  'chess_bullet' | 'chess_blitz' | 'chess_rapid' | 'chess_daily' | 'chess960_daily'

export type ChessComStats = Partial<Record<ChessComCategoryKey, ChessComCategoryStats>> & {
  fide?: number
  tactics?: {
    highest?: { rating: number; date: number }
    lowest?: { rating: number; date: number }
  }
  puzzle_rush?: {
    best?: { total_attempts: number; score: number }
  }
}

export type ChessComPlayer = {
  profile: ChessComProfile
  stats: ChessComStats
}
