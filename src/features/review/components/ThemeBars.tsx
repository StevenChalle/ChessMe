import { InfoTip } from '@/components/InfoTip'
import { formatNumber, formatPercent } from '@/lib/format'
import { m } from '@/paraglide/messages'
import type { Mistake } from '../analyze'
import { THEME_LABELS } from '../themeLabels'
import { THEMES, themeCounts } from '../themes'

/**
 * Errors by theme, as horizontal bars: one per theme with errors, the largest first. Themes
 * overlap (an error can have several), so the bars are shares of all the errors, not parts of a
 * whole. A single series: one color, no legend, the numbers written next to each bar.
 */
export function ThemeBars({ mistakes }: { mistakes: Mistake[] }) {
  const counts = themeCounts(mistakes)
  const rows = THEMES.map((theme) => ({ theme, count: counts[theme] }))
    .filter(({ count }) => count > 0)
    .toSorted((a, b) => b.count - a.count)
  if (rows.length === 0) return null
  const max = rows[0]!.count

  return (
    <section className="space-y-3 rounded-md bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {m.results_themes_title()}
        </h3>
        <p className="text-xs text-muted-foreground">{m.results_themes_hint()}</p>
      </div>
      <ul className="space-y-2">
        {rows.map(({ theme, count }) => {
          const { label, info } = THEME_LABELS[theme]
          const text = m.results_theme_count({
            count: formatNumber(count),
            percent: formatPercent(count / mistakes.length),
          })
          return (
            <li
              key={theme}
              className="grid grid-cols-[minmax(8rem,12rem)_1fr_auto] items-center gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{label()}</span>
                <InfoTip text={info()} />
              </span>
              <span className="h-2.5 rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="text-right text-muted-foreground tabular-nums">{text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
