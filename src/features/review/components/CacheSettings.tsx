import { useEffect, useState } from 'react'
import type { ConfirmOptions } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { gameStoreStats } from '@/features/games/store'
import { formatGameCount, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { analysisCacheStats, clearAnalysisCache } from '../cache'

type Stats = {
  games: Awaited<ReturnType<typeof gameStoreStats>>
  analyses: Awaited<ReturnType<typeof analysisCacheStats>>
}

const loadStats = async (): Promise<Stats> => ({
  games: await gameStoreStats(),
  analyses: await analysisCacheStats(),
})

/**
 * What the browser keeps (the accounts' games, the analyses), each with a button to empty it.
 * Counted each time it is shown (the settings popover mounts it on opening). `confirm` comes from
 * outside the popover, whose content would unmount the dialog when it takes the focus.
 */
export function CacheSettings({
  confirm,
  onClearGames,
}: {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Opens the dialog choosing which players' games to keep (outside the popover too) */
  onClearGames: () => void
}) {
  const [stats, setStats] = useState<Stats | 'loading'>('loading')

  useEffect(() => {
    let current = true
    void loadStats().then((value) => current && setStats(value))
    return () => {
      current = false
    }
  }, [])

  const clear = async (options: ConfirmOptions, empty: () => Promise<boolean>) => {
    if (!(await confirm(options))) return
    await empty()
    setStats(await loadStats())
  }

  if (stats === 'loading') return null
  if (stats.games === undefined || stats.analyses === undefined) {
    return <p className="text-sm text-muted-foreground">{m.settings_cache_unavailable()}</p>
  }
  const { games, analyses } = stats
  if (games.games === 0 && analyses.games === 0 && analyses.positions === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">{m.settings_cache_hint()}</p>
        <p className="text-muted-foreground">{m.settings_cache_empty()}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-muted-foreground">{m.settings_cache_hint()}</p>
      <Row
        label={m.settings_cache_games()}
        value={formatGameCount(games.games)}
        empty={games.games === 0}
        onClear={onClearGames}
      />
      <Row
        label={m.settings_cache_analyses()}
        value={`${formatGameCount(analyses.games)} · ${m.positions_count({
          count: analyses.positions,
          formatted: formatNumber(analyses.positions),
        })}`}
        empty={analyses.games === 0 && analyses.positions === 0}
        onClear={() =>
          void clear(
            {
              title: m.settings_cache_confirm_title(),
              description: m.settings_cache_confirm_body(),
              confirmLabel: m.settings_cache_confirm_action(),
              cancelLabel: m.confirm_cancel(),
            },
            clearAnalysisCache,
          )
        }
      />
    </div>
  )
}

function Row({
  label,
  value,
  empty,
  onClear,
}: {
  label: string
  value: string
  empty: boolean
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </span>
      <Button variant="outline" size="sm" disabled={empty} onClick={onClear}>
        {m.settings_cache_clear()}
      </Button>
    </div>
  )
}
