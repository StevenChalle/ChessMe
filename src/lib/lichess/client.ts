import { fetchJson } from '@/lib/http'
import type { LichessUser } from './types'

const BASE_URL = 'https://lichess.org'

export function fetchUser(username: string, signal?: AbortSignal): Promise<LichessUser> {
  return fetchJson('lichess', `${BASE_URL}/api/user/${encodeURIComponent(username)}`, signal)
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
