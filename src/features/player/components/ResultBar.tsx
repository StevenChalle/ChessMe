import { formatNumber, formatPercent } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { totalGames, type GameRecord } from '../summary'

const SEGMENTS = [
  { key: 'win', label: m.result_wins, className: 'bg-good', textClassName: 'text-good' },
  { key: 'draw', label: m.result_draws, className: 'bg-font-dim', textClassName: 'text-font-dim' },
  { key: 'loss', label: m.result_losses, className: 'bg-bad', textClassName: 'text-bad' },
] as const

/** Win / draw / loss split as a single stacked bar with a legend. */
export function ResultBar({ record, compact }: { record: GameRecord; compact?: boolean }) {
  const total = totalGames(record)
  if (total === 0) return <p className="text-sm text-muted-foreground">{m.no_games()}</p>

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {SEGMENTS.map(({ key, className }) => (
          <div
            key={key}
            className={className}
            style={{ width: `${(record[key] / total) * 100}%` }}
          />
        ))}
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        {SEGMENTS.map(({ key, label, textClassName }) => (
          <div key={key} className="flex gap-1">
            <dt className={textClassName}>{label()}</dt>
            <dd className="text-font-clear">
              {formatPercent(record[key] / total)}
              {!compact && (
                <span className="text-muted-foreground"> · {formatNumber(record[key])}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
