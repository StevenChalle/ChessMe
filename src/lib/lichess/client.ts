import { fetchJson, fetchOk } from '@/lib/http'
import type { LichessGame, LichessUser } from './types'

const BASE_URL = 'https://lichess.org'

export function fetchUser(username: string, signal?: AbortSignal): Promise<LichessUser> {
  return fetchJson('lichess', `${BASE_URL}/api/user/${encodeURIComponent(username)}`, signal)
}

/** Standard chess only: variants are left out of the export by listing these perfs. */
const STANDARD_PERFS = 'ultraBullet,bullet,blitz,rapid,classical,correspondence'

/**
 * Latest rated standard games, newest first, with the server analysis when there is one.
 * A single streamed request: never run several Lichess exports at once.
 */
export async function fetchRecentGames(
  username: string,
  max: number,
  signal?: AbortSignal,
): Promise<LichessGame[]> {
  const params = new URLSearchParams({
    max: String(max),
    rated: 'true',
    perfType: STANDARD_PERFS,
    evals: 'true',
  })
  const url = `${BASE_URL}/api/games/user/${encodeURIComponent(username)}?${params}`
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
