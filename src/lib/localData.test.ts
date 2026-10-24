import { beforeEach, describe, expect, it } from 'vitest'
import { getFavorites, setFavorites } from '@/features/background/favorites'
import { database } from '@/lib/db'
import { clearLocalData, migrateLegacyKeys } from '@/lib/localData'

describe('migrateLegacyKeys', () => {
  beforeEach(() => localStorage.clear())

  it('moves the old ChessMe keys to the new names', () => {
    localStorage.setItem('chessme:board-style', '{"pieces":"merida"}')
    localStorage.setItem('PARAGLIDE_LOCALE', 'fr')
    migrateLegacyKeys()
    expect(localStorage.getItem('craftyourchess:board-style')).toBe('{"pieces":"merida"}')
    expect(localStorage.getItem('chessme:board-style')).toBeNull()
    expect(localStorage.getItem('PARAGLIDE_LOCALE')).toBe('fr')
  })

  it('keeps a value already saved under the new name', () => {
    localStorage.setItem('chessme:review-settings', 'old')
    localStorage.setItem('craftyourchess:review-settings', 'new')
    migrateLegacyKeys()
    expect(localStorage.getItem('craftyourchess:review-settings')).toBe('new')
    expect(localStorage.getItem('chessme:review-settings')).toBeNull()
  })
})

describe('clearLocalData', () => {
  it('forgets the favorites kept in memory, and the database for the rest of the page', async () => {
    setFavorites({ players: [{ lichess: 'alice' }], depth: 500, deep: true })
    expect(await clearLocalData()).toBe(true)
    expect(getFavorites()).toBeUndefined()
    expect(localStorage.length).toBe(0)
    // A background analysis finishing must not create it again.
    expect(() => database()).toThrow('Local data deleted')
  })
})
