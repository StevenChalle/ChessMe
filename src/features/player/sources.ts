import { ApiError, type ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import { SOURCE_LABELS, type Category } from './summary'

const CATEGORY_LABELS: Record<Category, () => string> = {
  bullet: m.category_bullet,
  blitz: m.category_blitz,
  rapid: m.category_rapid,
  classical: m.category_classical,
  daily: m.category_daily,
}

/** Tailwind background class carrying each platform's identity color. */
export const SOURCE_COLOR_CLASS: Record<ApiSource, string> = {
  lichess: 'bg-lichess',
  chesscom: 'bg-chesscom',
}

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category]()
}

export function sourceErrorMessage(source: ApiSource, error: Error): string {
  const label = SOURCE_LABELS[source]
  if (error instanceof ApiError && error.isRateLimited) {
    return m.error_rate_limited({ platform: label })
  }
  return m.error_unreachable({ platform: label })
}
