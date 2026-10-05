import { Play, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SourceLabel } from '@/features/player/components/SourceBadge'
import { categoryLabel, sourceErrorMessage } from '@/features/player/sources'
import { CATEGORIES } from '@/features/player/summary'
import { detectDevice } from '@/lib/device'
import { formatEstimate, formatGameCount, formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import type { ReviewCriteria } from '../criteria'
import { desktopSpeedup, deviceProfile, estimateSeconds } from '../estimate'
import type { FoundGames } from '../fetch'
import { LARGE_REVIEW } from '../selection'

const SOURCES: ApiSource[] = ['lichess', 'chesscom']

/** What the search found (shown under the filters), how long the analysis should take, and the button to launch it (top right). */
export function ReviewRecap({
  found: { games, failures },
  criteria,
  onLaunch,
}: {
  found: FoundGames
  criteria: ReviewCriteria
  onLaunch: () => void
}) {
  // The estimate is for the device running the analysis: its kind and its engines.
  const device = detectDevice()
  const profile = deviceProfile(device)
  // On a phone or a tablet: how much faster a computer would be.
  const speedup = device === 'mobile' ? desktopSpeedup(games, criteria, profile) : undefined
  const bySource = SOURCES.map((source) => ({
    source,
    count: games.filter((game) => game.source === source).length,
  })).filter(({ count }) => count > 0)
  // Their evaluations are reused: already left out of the estimate.
  const serverAnalysed = games.filter((game) => game.serverCps !== undefined).length
  const byCategory = CATEGORIES.map((category) => ({
    category,
    count: games.filter((game) => game.category === category).length,
  })).filter(({ count }) => count > 0)

  return (
    <div className="space-y-4">
      {failures.map(({ source, error }) => (
        <p key={source} className="text-sm text-bad">
          {sourceErrorMessage(source, error)}
        </p>
      ))}

      {games.length === 0 ? (
        <p className="text-muted-foreground">{m.recap_none()}</p>
      ) : (
        <div className="space-y-3 rounded-md bg-muted/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {m.recap_title()}
              </p>
              <p className="text-2xl font-medium text-font-clear tabular-nums">
                {formatGameCount(games.length)}
              </p>
            </div>
            <Button size="lg" onClick={onLaunch}>
              <Play data-icon="inline-start" />
              {m.recap_launch()}
            </Button>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {bySource.map(({ source, count }) => (
              <span key={source} className="inline-flex items-center gap-1.5">
                <SourceLabel source={source} />
                <span className="text-muted-foreground tabular-nums">{formatNumber(count)}</span>
              </span>
            ))}
            {byCategory.map(({ category, count }) => (
              <span key={category} className="text-muted-foreground">
                {categoryLabel(category)}{' '}
                <span className="tabular-nums">{formatNumber(count)}</span>
              </span>
            ))}
          </p>
          <div className="space-y-0.5 pt-1">
            <p className="text-font-clear">
              {m.recap_estimate({
                time: formatEstimate(estimateSeconds(games, criteria, profile)),
              })}
            </p>
            {speedup !== undefined && (
              <p className="text-sm text-font-clear">
                {m.recap_faster_on_desktop({ times: String(speedup) })}
              </p>
            )}
            {serverAnalysed > 0 && (
              <p className="text-xs text-muted-foreground">
                {m.recap_server_analysed({
                  count: serverAnalysed,
                  formatted: formatNumber(serverAnalysed),
                })}
              </p>
            )}
          </div>
          {games.length >= LARGE_REVIEW && (
            <p className="flex gap-2 rounded-md border border-brag/40 bg-brag/10 p-3 text-sm text-font-clear">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-brag" />
              {m.recap_large_warning()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
