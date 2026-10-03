import type { ApiSource } from '@/lib/http'
import { CATEGORIES, type AccountSummary } from '../summary'
import { Panel } from './Panel'
import { SourceLabel } from './SourceBadge'

/**
 * Current rating per category, side by side. Deliberately not merged or converted:
 * the two rating systems are not comparable.
 */
export function CurrentRatings({
  accounts,
  sources,
}: {
  accounts: AccountSummary[]
  sources: ApiSource[]
}) {
  const bySource = new Map(accounts.map((account) => [account.source, account]))
  const rows = CATEGORIES.filter(({ key }) => accounts.some((account) => account.categories[key]))

  return (
    <Panel title="Elo actuel" aside="Systèmes différents, non comparables">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune partie classée.</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 text-left font-normal">Cadence</th>
              {sources.map((source) => (
                <th key={source} className="pb-2 text-right font-normal">
                  <SourceLabel source={source} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <tr key={key} className="even:bg-zebra">
                <td className="py-1.5 pl-1">{label}</td>
                {sources.map((source) => {
                  const stats = bySource.get(source)?.categories[key]
                  return (
                    <td key={source} className="py-1.5 pr-1 text-right font-medium text-font-clear">
                      {stats?.rating ?? (
                        <span className="font-normal text-muted-foreground">—</span>
                      )}
                      {stats?.provisional && <span className="text-muted-foreground">?</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
