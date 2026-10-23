import { useSyncExternalStore } from 'react'
import type { ReviewGame } from '@/features/review/games'

/**
 * The games imported last, in memory only: a new import replaces them, a reload forgets them
 * (nothing is saved, as for the accounts' games).
 */
export type ImportedGames = {
  /** Changes with every import: a new batch gets a fresh analysis session */
  id?: number
  /** From the player's side, in the file's order */
  games: ReviewGame[]
  /** The names the player said were theirs */
  names: string[]
}

let current: ImportedGames | undefined
let imports = 0
const listeners = new Set<() => void>()

export function setImportedGames(value: ImportedGames | undefined) {
  imports += 1
  current = value && { ...value, id: imports }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useImportedGames(): ImportedGames | undefined {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  )
}
