import { fetchJson, fetchOk } from '@/lib/http'
import type { LichessGame, LichessUser } from './types'

const BASE_URL = 'https://lichess.org'

export function fetchUser(username: string, signal?: AbortSignal): Promise<LichessUser> {
  return fetchJson('lichess', `${BASE_URL}/api/user/${encodeURIComponent(username)}`, signal)
}

/** Standard chess only: variants are left out of the export by listing these perfs. */
const STANDARD_PERFS = 'ultraBullet,bullet,blitz,rapid,classical,correspondence'

/** Streams a game export (NDJSON) with the given query parameters, newest first. */
async function exportGames(
  username: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<LichessGame[]> {
  const query = new URLSearchParams(params)
  const url = `${BASE_URL}/api/games/user/${encodeURIComponent(username)}?${query}`
  const response = await fetchOk('lichess', url, {
    signal,
    headers: { Accept: 'application/x-ndjson' },
  })
  const games: LichessGame[] = []
  if (!response.body) return games
  for await (const game of readNdjson<LichessGame>(response.body)) games.push(game)
  return games
}

/**
 * Latest rated standard games, newest first, with the server analysis when there is one.
 * A single streamed request: never run several Lichess exports at once.
 */
export function fetchRecentGames(
  username: string,
  max: number,
  signal?: AbortSignal,
): Promise<LichessGame[]> {
  return exportGames(
    username,
    { max: String(max), rated: 'true', perfType: STANDARD_PERFS, evals: 'true' },
    signal,
  )
}

/**
 * One page of the game history, all games (casual and variants included), newest first,
 * without moves. `until` (Unix ms, exclusive upper bound on the start date) pages backwards.
 */
export function fetchGamesPage(
  username: string,
  max: number,
  until: number | undefined,
  signal?: AbortSignal,
): Promise<LichessGame[]> {
  const params: Record<string, string> = { max: String(max), moves: 'false' }
  if (until !== undefined) params.until = String(until)
  return exportGames(username, params, signal)
}

/**
 * Parses a newline-delimited JSON stream, yielding one object per line as it arrives.
 * Used for game exports, which can take minutes for a whole career.
 */
export async function* readNdjson<T>(
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
): AsyncGenerator<T> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line) as T
      }
    }
    if (buffer.trim()) yield JSON.parse(buffer) as T
  } finally {
    reader.releaseLock()
  }
}
