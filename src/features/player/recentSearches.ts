import { useCallback, useSyncExternalStore } from 'react'
import type { PlayerUsernames } from './search'

/**
 * Recent profile searches, kept per browser in localStorage: a small convenience,
 * read synchronously so the home page renders them without a loading state.
 */

export type RecentSearch = PlayerUsernames & {
  /** Unix milliseconds */
  searchedAt: number
}

const STORAGE_KEY = 'chessme:recent-searches'
const MAX_STORED = 10

function sameSearch(a: PlayerUsernames, b: PlayerUsernames): boolean {
  const norm = (value: string | undefined) => value?.toLowerCase() ?? ''
  return norm(a.lichess) === norm(b.lichess) && norm(a.chesscom) === norm(b.chesscom)
}

/** Newest first, without duplicates (case-insensitive), capped. */
export function addRecentSearch(
  list: RecentSearch[],
  usernames: PlayerUsernames,
  now: number,
): RecentSearch[] {
  if (!usernames.lichess && !usernames.chesscom) return list
  const entry: RecentSearch = { ...usernames, searchedAt: now }
  return [entry, ...list.filter((item) => !sameSearch(item, usernames))].slice(0, MAX_STORED)
}

export function removeRecentSearch(list: RecentSearch[], usernames: PlayerUsernames) {
  return list.filter((item) => !sameSearch(item, usernames))
}

/** Tolerates missing, corrupted or hand-edited storage. */
export function parseRecentSearches(raw: string | null): RecentSearch[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is RecentSearch =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.searchedAt === 'number' &&
        (typeof item.lichess === 'string' || typeof item.chesscom === 'string'),
    )
  } catch {
    return []
  }
}

/* ---------- localStorage-backed store, for useSyncExternalStore ---------- */

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedList: RecentSearch[] = []

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode, blocked site data)
    return null
  }
}

function getSnapshot(): RecentSearch[] {
  const raw = readRaw()
  // Return the same array until storage changes, as useSyncExternalStore requires.
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedList = parseRecentSearches(raw)
  }
  return cachedList
}

function update(change: (list: RecentSearch[]) => RecentSearch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(change(getSnapshot())))
  } catch {
    return
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keeps other tabs in sync
  const onStorage = (event: StorageEvent) => event.key === STORAGE_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function saveRecentSearch(usernames: PlayerUsernames) {
  update((list) => addRecentSearch(list, usernames, Date.now()))
}

export function useRecentSearches(limit: number) {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => [])
  const remove = useCallback(
    (usernames: PlayerUsernames) => update((current) => removeRecentSearch(current, usernames)),
    [],
  )
  return { searches: list.slice(0, limit), remove }
}
