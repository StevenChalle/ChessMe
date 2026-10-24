import { useSyncExternalStore } from 'react'
import type { ReviewAccount } from '@/features/review/fetch'
import { detectDevice, type DeviceKind } from '@/lib/device'
import { LOCAL_DATA_CLEARED } from '@/lib/localData'

/**
 * The favorite players, whose latest games the app keeps fetched and analysed in the background
 * (docs/background-analysis.md), and how many of them. A player is a Lichess account, a Chess.com
 * account, or both: the accounts shown on a profile, with their own options. Per browser (localStorage): declared on the
 * /legal page, cleared by clearLocalData(). Without favorites, nothing runs.
 */

/**
 * How many latest games are followed per player: a range by steps, with a few landmarks shown
 * under it. A phone does far less engine work.
 */
export type DepthRange = { min: number; max: number; step: number; marks: readonly number[] }

export const DEPTH_RANGES: Record<DeviceKind, DepthRange> = {
  desktop: { min: 50, max: 1000, step: 50, marks: [50, 200, 500, 1000] },
  mobile: { min: 10, max: 150, step: 5, marks: [10, 25, 50, 150] },
}
export type Depth = number

export function depthRange(device: DeviceKind = detectDevice()): DepthRange {
  return DEPTH_RANGES[device]
}

/** A number of games this device offers: in its range, on a step. */
export function isValidDepth(depth: unknown, range: DepthRange = depthRange()): depth is Depth {
  return (
    typeof depth === 'number' &&
    depth >= range.min &&
    depth <= range.max &&
    (depth - range.min) % range.step === 0
  )
}

/** A computer can afford hours of engine time; a phone, much less (and it gets hot). */
export function defaultDepth(device: DeviceKind = detectDevice()): Depth {
  return device === 'mobile' ? 50 : 500
}

/** What the background does for one favorite. */
export type FavoriteOptions = {
  /** Their latest games followed, all their platforms together */
  depth: Depth
  /**
   * Then evaluate every position deeply, not only around the suspicious moves (on by default):
   * once the first analysis of all the games is over.
   */
  deep: boolean
}

/** One favorite: a Lichess account, a Chess.com account, or both, and their options. */
export type PlayerNames = { lichess?: string; chesscom?: string }
export type FavoritePlayer = PlayerNames & FavoriteOptions

export type Favorites = { players: FavoritePlayer[] }

/** A new favorite's options: the device's default number of games, deep analysis on. */
export function defaultOptions(): FavoriteOptions {
  return { depth: defaultDepth(), deep: true }
}

const STORAGE_KEY = 'craftyourchess:favorites'
/** Before favorites, one main account per platform: it becomes the first favorite. */
const LEGACY_KEY = 'craftyourchess:main-profile'
const listeners = new Set<() => void>()

const username = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

/** Saved options, else those of `fallback` (shared by all the favorites before), else defaults. */
function parseOptions(data: Record<string, unknown>, fallback?: Record<string, unknown>) {
  const depth = [data.depth, fallback?.depth].find((value) => isValidDepth(value))
  const deep = typeof data.deep === 'boolean' ? data.deep : fallback?.deep !== false
  return { depth: depth ?? defaultDepth(), deep }
}

function parsePlayer(
  value: unknown,
  fallback?: Record<string, unknown>,
): FavoritePlayer | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const data = value as Record<string, unknown>
  const lichess = username(data.lichess)
  const chesscom = username(data.chesscom)
  if (!lichess && !chesscom) return undefined
  return {
    ...(lichess && { lichess }),
    ...(chesscom && { chesscom }),
    ...parseOptions(data, fallback),
  }
}

/** The saved favorites, undefined without any player (or if invalid). */
export function parseFavorites(raw: string | null): Favorites | undefined {
  try {
    const data = JSON.parse(raw ?? 'null') as Record<string, unknown> | null
    if (!data || !Array.isArray(data.players)) return undefined
    // Options were once shared by all the favorites: each one takes them.
    const players = data.players.flatMap((item) => parsePlayer(item, data) ?? [])
    return players.length > 0 ? { players } : undefined
  } catch {
    return undefined
  }
}

/** The main accounts saved before favorites existed, as the first favorite. */
export function parseLegacyMainProfile(raw: string | null): Favorites | undefined {
  try {
    const player = parsePlayer(JSON.parse(raw ?? 'null'))
    return player ? { players: [player] } : undefined
  } catch {
    return undefined
  }
}

function read(): Favorites | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) return parseFavorites(saved)
    const legacy = parseLegacyMainProfile(localStorage.getItem(LEGACY_KEY))
    localStorage.removeItem(LEGACY_KEY)
    if (legacy) localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    return legacy
  } catch {
    return undefined
  }
}

let current = read()

// Changed in another tab, or the local data deleted here: this one follows (its background
// analysis starts, stops or changes).
if (typeof window !== 'undefined') {
  const reload = () => {
    current = read()
    for (const listener of listeners) listener()
  }
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) reload()
  })
  window.addEventListener(LOCAL_DATA_CLEARED, reload)
}

/** Saves the favorites (undefined forgets them), for every component using them. */
export function setFavorites(favorites: Favorites | undefined) {
  current = favorites && parseFavorites(JSON.stringify(favorites))
  try {
    if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Not saved: still applies until the page is reloaded
  }
  for (const listener of listeners) listener()
}

export function getFavorites(): Favorites | undefined {
  return current
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFavorites(): Favorites | undefined {
  return useSyncExternalStore(subscribeFavorites, getFavorites)
}

/** A player's accounts, in the review's terms. */
export function playerAccounts(player: PlayerNames): ReviewAccount[] {
  return [
    ...(player.lichess ? [{ source: 'lichess' as const, username: player.lichess }] : []),
    ...(player.chesscom ? [{ source: 'chesscom' as const, username: player.chesscom }] : []),
  ]
}

/** 'lichess:alice': Lichess and Chess.com usernames are case-insensitive. */
const key = ({ source, username }: ReviewAccount) => `${source}:${username.toLowerCase()}`

/** Every account of every favorite, once. */
export function favoriteAccounts(favorites: Favorites): ReviewAccount[] {
  const accounts = favorites.players.flatMap(playerAccounts)
  return accounts.filter(
    (account, index) => accounts.findIndex((other) => key(other) === key(account)) === index,
  )
}

/** Every account shown is already in the favorites. */
export function isFavorite(favorites: Favorites | undefined, accounts: ReviewAccount[]): boolean {
  if (!favorites || accounts.length === 0) return false
  const saved = favoriteAccounts(favorites).map(key)
  return accounts.every((account) => saved.includes(key(account)))
}

/** The platforms `accounts` have, by name. */
function asNames(accounts: ReviewAccount[]): PlayerNames {
  const name = (source: ReviewAccount['source']) =>
    accounts.find((account) => account.source === source)?.username
  const lichess = name('lichess')
  const chesscom = name('chesscom')
  return { ...(lichess && { lichess }), ...(chesscom && { chesscom }) }
}

/**
 * The favorite `accounts` would join: one sharing one of them, and not another account on the
 * same platform, is the same player (a profile seen from one platform, then from both). -1 if
 * none: they would be a new favorite.
 */
export function favoriteIndex(favorites: Favorites | undefined, accounts: ReviewAccount[]): number {
  const shown = accounts.map(key)
  return (favorites?.players ?? []).findIndex((player) => {
    const own = playerAccounts(player)
    const shares = own.some((account) => shown.includes(key(account)))
    const conflicts = accounts.some((account) =>
      own.some((item) => item.source === account.source && key(item) !== key(account)),
    )
    return shares && !conflicts
  })
}

/**
 * The favorites with `accounts` added, with these options: joining the same player
 * (favoriteIndex), otherwise a new favorite, last.
 */
export function withFavorite(
  favorites: Favorites | undefined,
  accounts: ReviewAccount[],
  options: FavoriteOptions = defaultOptions(),
): Favorites {
  const players = favorites?.players ?? []
  const index = favoriteIndex(favorites, accounts)
  const added = { ...asNames(accounts), ...options }
  return {
    players:
      index >= 0
        ? players.map((player, at) => (at === index ? { ...player, ...added } : player))
        : [...players, added],
  }
}

/** The favorites with new options for the player at `index`. */
export function withOptions(
  favorites: Favorites,
  index: number,
  options: Partial<FavoriteOptions>,
): Favorites {
  return {
    players: favorites.players.map((player, at) =>
      at === index ? { ...player, ...options } : player,
    ),
  }
}

/** The favorites without these accounts; a player left with none goes; undefined when none is left. */
export function withoutFavorite(
  favorites: Favorites,
  accounts: ReviewAccount[],
): Favorites | undefined {
  const dropped = accounts.map(key)
  const players = favorites.players.flatMap((player) => {
    const kept = playerAccounts(player).filter((account) => !dropped.includes(key(account)))
    return kept.length > 0 ? [{ ...asNames(kept), depth: player.depth, deep: player.deep }] : []
  })
  return players.length > 0 ? { players } : undefined
}

/** How a player is named: their username, or both when they differ ("alice · alice_cc"). */
export function playerName(player: PlayerNames): string {
  const names = playerAccounts(player).map((account) => account.username)
  const distinct = names.filter(
    (name, index) =>
      names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index,
  )
  return distinct.join(' · ')
}
