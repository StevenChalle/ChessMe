/**
 * Periods of time (Unix ms, both bounds included), as the game store uses them to know which
 * games it holds. Kept sorted and merged: no two periods overlap or touch.
 */

export type Period = { from: number; to: number }

/** Sorted, with the periods that overlap or touch merged. */
export function mergePeriods(periods: Period[]): Period[] {
  const sorted = periods
    .filter((period) => period.from <= period.to)
    .toSorted((a, b) => a.from - b.from)
  const merged: Period[] = []
  for (const period of sorted) {
    const last = merged.at(-1)
    if (last && period.from <= last.to + 1) last.to = Math.max(last.to, period.to)
    else merged.push({ ...period })
  }
  return merged
}

/** The parts of `wanted` that no period covers, oldest first. */
export function missingPeriods(covered: Period[], wanted: Period): Period[] {
  const missing: Period[] = []
  let from = wanted.from
  for (const period of mergePeriods(covered)) {
    if (period.to < from) continue
    if (period.from > wanted.to) break
    if (period.from > from) missing.push({ from, to: period.from - 1 })
    from = Math.max(from, period.to + 1)
    if (from > wanted.to) return missing
  }
  if (from <= wanted.to) missing.push({ from, to: wanted.to })
  return missing
}
