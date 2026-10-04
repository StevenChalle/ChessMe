import { fetchJson } from '@/lib/http'
import type { ChessComGame, ChessComPlayer, ChessComProfile, ChessComStats } from './types'

const BASE_URL = 'https://api.chess.com/pub'

// Chess.com 301-redirects mixed-case usernames to lowercase: skip the extra round trip.
const playerUrl = (username: string) =>
  `${BASE_URL}/player/${encodeURIComponent(username.toLowerCase())}`

// Browsers forbid setting User-Agent, so we cannot identify ourselves as Chess.com asks;
// staying strictly serial keeps us well within their limits.

export function fetchProfile(username: string, signal?: AbortSignal): Promise<ChessComProfile> {
  return fetchJson('chesscom', playerUrl(username), signal)
}

export function fetchStats(username: string, signal?: AbortSignal): Promise<ChessComStats> {
  return fetchJson('chesscom', `${playerUrl(username)}/stats`, signal)
}

/** Profile then stats, one after the other: Chess.com rate-limits parallel requests. */
export async function fetchPlayer(username: string, signal?: AbortSignal): Promise<ChessComPlayer> {
  const profile = await fetchProfile(username, signal)
  const stats = await fetchStats(username, signal)
  return { profile, stats }
}

/** Monthly archive URLs, oldest first. */
export async function fetchArchives(username: string, signal?: AbortSignal): Promise<string[]> {
  const { archives } = await fetchJson<{ archives: string[] }>(
    'chesscom',
    `${playerUrl(username)}/games/archives`,
    signal,
  )
  return archives
}

/** Games of one monthly archive (a URL from fetchArchives), oldest first. */
export async function fetchArchiveGames(
  archiveUrl: string,
  signal?: AbortSignal,
): Promise<ChessComGame[]> {
  const { games } = await fetchJson<{ games: ChessComGame[] }>('chesscom', archiveUrl, signal)
  return games
}
