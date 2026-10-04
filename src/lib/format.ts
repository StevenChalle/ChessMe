import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

/**
 * Locale-aware formatting helpers. Formatters follow the current UI locale
 * and are cached per locale (Intl constructors are relatively expensive).
 */

function cachedPerLocale<T>(create: (locale: string) => T): () => T {
  const cache = new Map<string, T>()
  return () => {
    const locale = getLocale()
    let formatter = cache.get(locale)
    if (!formatter) {
      formatter = create(locale)
      cache.set(locale, formatter)
    }
    return formatter
  }
}

const numberFormat = cachedPerLocale((locale) => new Intl.NumberFormat(locale))
const percentFormat = cachedPerLocale(
  (locale) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
)
const monthYearFormat = cachedPerLocale(
  (locale) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
)
const dateFormat = cachedPerLocale(
  (locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
)
const relativeFormat = cachedPerLocale(
  (locale) => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
)
const regionNames = cachedPerLocale((locale) => new Intl.DisplayNames([locale], { type: 'region' }))
const orList = cachedPerLocale((locale) => new Intl.ListFormat(locale, { type: 'disjunction' }))

export function formatNumber(value: number): string {
  return numberFormat().format(value)
}

/** "1 game" / "1 234 parties", with the locale's plural rules */
export function formatGameCount(count: number): string {
  return m.games_count({ count, formatted: formatNumber(count) })
}

export function formatPercent(ratio: number): string {
  return percentFormat().format(ratio)
}

export function formatMonthYear(date: Date): string {
  return monthYearFormat().format(date)
}

export function formatDate(date: Date): string {
  return dateFormat().format(date)
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
    if (Math.abs(seconds) >= size) return relativeFormat().format(Math.round(seconds / size), unit)
  }
  return m.just_now()
}

/** Hours, rounded: "1,234 h" / "1 234 h" */
export function formatHours(seconds: number): string {
  return `${formatNumber(Math.round(seconds / 3600))} h`
}

const secondsFormat = cachedPerLocale(
  (locale) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'second' }),
)
const minutesFormat = cachedPerLocale(
  (locale) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute' }),
)

/** Rough remaining time: "45 sec" (by 5 s steps), then whole minutes: "3 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return secondsFormat().format(Math.max(5, Math.ceil(seconds / 5) * 5))
  return minutesFormat().format(Math.ceil(seconds / 60))
}

/** Stopwatch: "0:07", "1:42", "12:05" */
export function formatClock(seconds: number): string {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** "a", "a or b", "a, b, or c" */
export function formatOrList(items: string[]): string {
  return orList().format(items)
}

/** "FR" → "France" / "France". Returns undefined for codes that are not countries. */
export function countryName(code: string | undefined): string | undefined {
  if (!code || !/^[A-Z]{2}$/.test(code)) return undefined
  const name = regionNames().of(code)
  return name && name !== code ? name : undefined
}
