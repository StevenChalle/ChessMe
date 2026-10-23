import { useEffect, useState } from 'react'
import type { ConfirmOptions } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { formatGameCount, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { analysisCacheStats, clearAnalysisCache } from '../cache'

type Stats = Awaited<ReturnType<typeof analysisCacheStats>>

/**
 * What the analysis cache holds, and a button to empty it. Counted each time it is shown (the
 * settings popover mounts it on opening). `confirm` comes from outside the popover, whose content
 * would unmount the dialog when it takes the focus.
 */
export function CacheSettings({
  confirm,
}: {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}) {
  const [stats, setStats] = useState<Stats | 'loading'>('loading')

  useEffect(() => {
    let current = true
    void analysisCacheStats().then((value) => current && setStats(value))
    return () => {
      current = false
    }
  }, [])

  const clear = async () => {
    const confirmed = await confirm({
      title: m.settings_cache_confirm_title(),
      description: m.settings_cache_confirm_body(),
      confirmLabel: m.settings_cache_confirm_action(),
      cancelLabel: m.confirm_cancel(),
    })
    if (!confirmed) return
    await clearAnalysisCache()
    setStats(await analysisCacheStats())
  }

  if (stats === 'loading') return null
  const empty = stats !== undefined && stats.games === 0 && stats.positions === 0

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-muted-foreground">{m.settings_cache_hint()}</p>
      {stats === undefined ? (
        <p className="text-muted-foreground">{m.settings_cache_unavailable()}</p>
      ) : empty ? (
        <p className="text-muted-foreground">{m.settings_cache_empty()}</p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="tabular-nums">
            {formatGameCount(stats.games)} ·{' '}
            {m.positions_count({
              count: stats.positions,
              formatted: formatNumber(stats.positions),
            })}
          </span>
          <Button variant="outline" size="sm" onClick={() => void clear()}>
            {m.settings_cache_clear()}
          </Button>
        </div>
      )}
    </div>
  )
}
