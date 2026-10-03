import { ApiError, type ApiSource } from '@/lib/http'
import { SOURCE_LABELS } from './summary'

/** Tailwind background class carrying each platform's identity color. */
export const SOURCE_COLOR_CLASS: Record<ApiSource, string> = {
  lichess: 'bg-lichess',
  chesscom: 'bg-chesscom',
}

export function sourceErrorMessage(source: ApiSource, error: Error): string {
  const label = SOURCE_LABELS[source]
  if (error instanceof ApiError && error.isRateLimited) {
    return `Trop de requêtes vers ${label}. Réessaie dans une minute.`
  }
  return `Impossible de joindre ${label}.`
}
