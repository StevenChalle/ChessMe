import type { LichessUser } from './types'

const BASE_URL = 'https://lichess.org'

export class LichessError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'LichessError'
    this.status = status
  }

  get isNotFound() {
    return this.status === 404
  }

  /** Lichess asks clients to wait a full minute after a 429. */
  get isRateLimited() {
    return this.status === 429
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, init)
  if (!response.ok) {
    throw new LichessError(response.status, `Lichess ${path} failed with ${response.status}`)
  }
  return response
}

export async function fetchUser(username: string, signal?: AbortSignal): Promise<LichessUser> {
  const response = await request(`/api/user/${encodeURIComponent(username)}`, { signal })
  return (await response.json()) as LichessUser
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
