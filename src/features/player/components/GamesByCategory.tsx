import { formatNumber } from '@/lib/format'
import { SOURCE_COLOR_CLASS } from '../sources'
import { gamesByCategory, SOURCE_LABELS, type AccountSummary } from '../summary'
import { Panel } from './Panel'
import { SourceLabel } from './SourceBadge'

/** Rated games per category, both platforms stacked (game counts are additive, unlike ratings). */
export function GamesByCategory({ accounts }: { accounts: AccountSummary[] }) {
  const rows = gamesByCategory(accounts)
  const max = Math.max(1, ...rows.map(({ total }) => total))

  return (
    <Panel
      title="Parties classées par cadence"
      aside={
        accounts.length > 1 && (
          <span className="flex gap-3">
            {accounts.map(({ source }) => (
              <SourceLabel key={source} source={source} />
            ))}
          </span>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune partie classée.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ category, label, bySource, total }) => (
            <li
              key={category}
              className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-sm"
            >
              <span>{label}</span>
              <div
                className="flex h-2 overflow-hidden rounded-full"
                style={{ width: `${(total / max) * 100}%` }}
              >
                {bySource.map(({ source, games }) => (
                  <div
                    key={source}
                    className={SOURCE_COLOR_CLASS[source]}
                    style={{ width: `${(games / total) * 100}%` }}
                    title={`${SOURCE_LABELS[source]} : ${formatNumber(games)}`}
                  />
                ))}
              </div>
              <span className="text-right text-font-clear tabular-nums">{formatNumber(total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
