import type { GameCategory, GameSource } from '@/features/games/normalize'
import { ApiError, type ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import { SOURCE_LABELS } from './summary'

const CATEGORY_LABELS: Record<GameCategory, () => string> = {
  bullet: m.category_bullet,
  blitz: m.category_blitz,
  rapid: m.category_rapid,
  classical: m.category_classical,
  daily: m.category_daily,
  unknown: m.category_unknown,
}

/** Tailwind background class carrying each origin's color (dots, stacked bars). */
export const SOURCE_COLOR_CLASS: Record<GameSource, string> = {
  lichess: 'bg-lichess',
  chesscom: 'bg-chesscom',
  import: 'bg-muted-foreground',
}

/** "Lichess", "Chess.com" (brand names), or "Imported" (translated). */
export function sourceLabel(source: GameSource): string {
  return source === 'import' ? m.source_import() : SOURCE_LABELS[source]
}

export function categoryLabel(category: GameCategory): string {
  return CATEGORY_LABELS[category]()
}

export function sourceErrorMessage(source: ApiSource, error: Error): string {
  const label = SOURCE_LABELS[source]
  if (error instanceof ApiError && error.isRateLimited) {
    return m.error_rate_limited({ platform: label })
  }
  return m.error_unreachable({ platform: label })
}
