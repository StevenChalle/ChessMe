import type { ApiSource } from '@/lib/http'

/** Accounts linked on the profile page, one optional username per platform. */
export type PlayerUsernames = Partial<Record<ApiSource, string>>

/**
 * What the profile page's address says: the accounts, or `import` for the games imported last
 * (never both). Kept when switching tabs.
 */
export type ProfileSearch = PlayerUsernames & { import?: true }

/**
 * TanStack Router JSON-parses search values, so a numeric username like "1234" arrives as a number.
 */
export function cleanUsername(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const trimmed = String(value).trim()
  return trimmed || undefined
}

export function validatePlayerSearch(search: Record<string, unknown>): PlayerUsernames {
  const result: PlayerUsernames = {}
  const lichess = cleanUsername(search.lichess)
  const chesscom = cleanUsername(search.chesscom)
  if (lichess) result.lichess = lichess
  if (chesscom) result.chesscom = chesscom
  return result
}

export function hasAnyUsername(usernames: PlayerUsernames): boolean {
  return Boolean(usernames.lichess || usernames.chesscom)
}

export function otherSource(source: ApiSource): ApiSource {
  return source === 'lichess' ? 'chesscom' : 'lichess'
}

/**
 * Which field the single "same username" button copies from: the last edited one if it has a
 * value, otherwise whichever is filled (Lichess first). Null when there is nothing useful to copy.
 */
export function copySource(
  values: Record<ApiSource, string>,
  lastEdited: ApiSource | null,
): ApiSource | null {
  const candidates: ApiSource[] = lastEdited
    ? [lastEdited, otherSource(lastEdited)]
    : ['lichess', 'chesscom']
  const from = candidates.find((source) => cleanUsername(values[source]))
  if (!from) return null
  return cleanUsername(values[from]) === cleanUsername(values[otherSource(from)]) ? null : from
}

/** The usernames for a page title: each once, whatever its case ("Hikaru / hikaru" is "Hikaru"). */
export function usernamesLabel(usernames: PlayerUsernames): string {
  const names = [usernames.lichess, usernames.chesscom].filter((name) => name !== undefined)
  return names
    .filter(
      (name, index) =>
        names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index,
    )
    .join(' / ')
}
