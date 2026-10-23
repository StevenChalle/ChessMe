import { useSyncExternalStore } from 'react'
import type { ReviewAccount } from '@/features/review/fetch'
import { detectDevice, type DeviceKind } from '@/lib/device'

/**
 * The player's main accounts and how many of their latest games the app keeps analysed in the
 * background (docs/background-analysis.md). Per browser (localStorage): declared on the /legal
 * page, cleared by clearLocalData(). Without accounts, nothing runs.
 */

/** The latest games the player can choose to follow: a phone does far less engine work. */
export const DEPTHS: Record<DeviceKind, readonly number[]> = {
  desktop: [50, 200, 500, 1000],
  mobile: [10, 25, 50, 150],
}
export type Depth = number

export function depthsFor(device: DeviceKind = detectDevice()): readonly number[] {
  return DEPTHS[device]
}

export type MainProfile = {
  lichess?: string
  chesscom?: string
  /** The latest games followed, all platforms together */
  depth: Depth
  /**
   * Then evaluate every position deeply, not only around the suspicious moves (on by default):
   * once the first analysis of all the games is over.
   */
  deep: boolean
}

const STORAGE_KEY = 'craftyourchess:main-profile'
const listeners = new Set<() => void>()

/** A computer can afford hours of engine time; a phone, much less (and it gets hot). */
export function defaultDepth(device: DeviceKind = detectDevice()): Depth {
  return device === 'mobile' ? 50 : 500
}

const username = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

/** The saved profile, undefined without any account (or if invalid). */
export function parseMainProfile(raw: string | null): MainProfile | undefined {
  try {
    const data = JSON.parse(raw ?? 'null') as Record<string, unknown> | null
    if (!data) return undefined
    const lichess = username(data.lichess)
    const chesscom = username(data.chesscom)
    if (!lichess && !chesscom) return undefined
    const depth = depthsFor().find((item) => item === data.depth) ?? defaultDepth()
    return {
      ...(lichess && { lichess }),
      ...(chesscom && { chesscom }),
      depth,
      deep: data.deep !== false,
    }
  } catch {
    return undefined
  }
}

function read(): MainProfile | undefined {
  try {
    return parseMainProfile(localStorage.getItem(STORAGE_KEY))
  } catch {
    return undefined
  }
}

let current = read()

// Chosen or removed in another tab: this one follows (its background analysis starts or stops).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    current = read()
    for (const listener of listeners) listener()
  })
}

/** Saves the profile (undefined forgets it), for every component using it. */
export function setMainProfile(profile: MainProfile | undefined) {
  current = profile && parseMainProfile(JSON.stringify(profile))
  try {
    if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Not saved: still applies until the page is reloaded
  }
  for (const listener of listeners) listener()
}

export function getMainProfile(): MainProfile | undefined {
  return current
}

export function subscribeMainProfile(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMainProfile(): MainProfile | undefined {
  return useSyncExternalStore(subscribeMainProfile, getMainProfile)
}

/** 'lichess:alice' for each account: Lichess and Chess.com usernames are case-insensitive. */
function accountKeys(accounts: ReviewAccount[]): string[] {
  return accounts.map(({ source, username }) => `${source}:${username.toLowerCase()}`)
}

/**
 * Each account shown is already the main one of its platform. The accounts shown only ever
 * concern their own platforms: a Lichess profile never touches the Chess.com main account.
 */
export function areMainAccounts(
  profile: MainProfile | undefined,
  accounts: ReviewAccount[],
): boolean {
  if (!profile) return false
  const main = accountKeys(mainAccounts(profile))
  return accounts.length > 0 && accountKeys(accounts).every((key) => main.includes(key))
}

/** The main accounts that making `accounts` the main ones would replace: same platform, another name. */
export function replacedAccounts(
  profile: MainProfile | undefined,
  accounts: ReviewAccount[],
): ReviewAccount[] {
  if (!profile) return []
  const shown = accountKeys(accounts)
  return mainAccounts(profile).filter(
    (account) =>
      accounts.some((item) => item.source === account.source) &&
      !shown.includes(accountKeys([account])[0]!),
  )
}

/**
 * `accounts` as the main ones of their platforms; the other platform's main account and the
 * profile's other choices stay.
 */
export function withMainAccounts(
  profile: MainProfile | undefined,
  accounts: ReviewAccount[],
): MainProfile {
  const shown = (source: ReviewAccount['source']) =>
    accounts.find((account) => account.source === source)?.username
  const lichess = shown('lichess') ?? profile?.lichess
  const chesscom = shown('chesscom') ?? profile?.chesscom
  return {
    ...(lichess && { lichess }),
    ...(chesscom && { chesscom }),
    depth: profile?.depth ?? defaultDepth(),
    deep: profile?.deep ?? true,
  }
}

/** The accounts to search, in the review's terms. */
export function mainAccounts(profile: MainProfile): ReviewAccount[] {
  return [
    ...(profile.lichess ? [{ source: 'lichess' as const, username: profile.lichess }] : []),
    ...(profile.chesscom ? [{ source: 'chesscom' as const, username: profile.chesscom }] : []),
  ]
}
