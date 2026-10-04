export type ApiSource = 'lichess' | 'chesscom'

export class ApiError extends Error {
  readonly source: ApiSource
  readonly status: number

  constructor(source: ApiSource, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.source = source
    this.status = status
  }

  get isNotFound() {
    return this.status === 404
  }

  /** Both Lichess and Chess.com ask clients to back off (Lichess: a full minute) after a 429. */
  get isRateLimited() {
    return this.status === 429
  }
}

/** fetch() that throws an ApiError on any non-2xx status. */
export async function fetchOk(
  source: ApiSource,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new ApiError(source, response.status, `${url} failed with ${response.status}`)
  }
  return response
}

export async function fetchJson<T>(
  source: ApiSource,
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchOk(source, url, { signal })
  return (await response.json()) as T
}

/** Resolves to null when the resource does not exist (404), so "no account" is not an error. */
export async function orNullIfNotFound<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}

/** Retrying a 404 or a 429 is pointless (and both APIs dislike the latter). */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && (error.isNotFound || error.isRateLimited)) return false
  return failureCount < 2
}
