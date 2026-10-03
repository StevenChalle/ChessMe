const LOCALE = 'fr-FR'

const numberFormat = new Intl.NumberFormat(LOCALE)
const percentFormat = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })
const monthYearFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
const regionNames = new Intl.DisplayNames([LOCALE], { type: 'region' })

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** "1 partie", "2 parties", "1 234 parties" */
export function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(value)} ${Math.abs(value) < 2 ? singular : plural}`
}

export function formatPercent(ratio: number): string {
  return percentFormat.format(ratio)
}

export function formatMonthYear(date: Date): string {
  return monthYearFormat.format(date)
}

export function formatDate(date: Date): string {
  return dateFormat.format(date)
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelative(date: Date, now: Date = new Date()): string {
  const seconds = (date.getTime() - now.getTime()) / 1000
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit)
  }
  return 'à l’instant'
}

/** Hours, rounded: "1 234 h" */
export function formatHours(seconds: number): string {
  return `${formatNumber(Math.round(seconds / 3600))} h`
}

/** "FR" → "France". Returns undefined for codes that are not countries. */
export function countryName(code: string | undefined): string | undefined {
  if (!code || !/^[A-Z]{2}$/.test(code)) return undefined
  const name = regionNames.of(code)
  return name && name !== code ? name : undefined
}
