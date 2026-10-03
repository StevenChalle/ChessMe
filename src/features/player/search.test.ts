import { describe, expect, it } from 'vitest'
import { cleanUsername, copySource, hasAnyUsername, validatePlayerSearch } from './search'

describe('cleanUsername', () => {
  it('trims and drops empty values', () => {
    expect(cleanUsername('  Alice ')).toBe('Alice')
    expect(cleanUsername('   ')).toBeUndefined()
    expect(cleanUsername(undefined)).toBeUndefined()
    expect(cleanUsername({})).toBeUndefined()
  })

  it('accepts numeric usernames parsed as numbers from the URL', () => {
    expect(cleanUsername(1234)).toBe('1234')
  })
})

describe('validatePlayerSearch', () => {
  it('keeps each platform independently', () => {
    expect(validatePlayerSearch({ lichess: 'alice', chesscom: 'Alice_C' })).toEqual({
      lichess: 'alice',
      chesscom: 'Alice_C',
    })
    expect(validatePlayerSearch({ chesscom: 'bob', other: 'x' })).toEqual({ chesscom: 'bob' })
    expect(validatePlayerSearch({ lichess: '' })).toEqual({})
  })
})

describe('hasAnyUsername', () => {
  it('needs at least one account', () => {
    expect(hasAnyUsername({})).toBe(false)
    expect(hasAnyUsername({ chesscom: 'bob' })).toBe(true)
  })
})

describe('copySource', () => {
  it('copies from the last edited field', () => {
    expect(copySource({ lichess: 'a', chesscom: 'b' }, 'chesscom')).toBe('chesscom')
    expect(copySource({ lichess: 'a', chesscom: 'b' }, 'lichess')).toBe('lichess')
  })

  it('falls back to the filled field, Lichess first', () => {
    expect(copySource({ lichess: '', chesscom: 'b' }, 'lichess')).toBe('chesscom')
    expect(copySource({ lichess: '', chesscom: 'b' }, null)).toBe('chesscom')
    expect(copySource({ lichess: 'a', chesscom: 'b' }, null)).toBe('lichess')
  })

  it('returns null when there is nothing to copy', () => {
    expect(copySource({ lichess: ' ', chesscom: '' }, null)).toBeNull()
    expect(copySource({ lichess: 'a', chesscom: ' a ' }, 'lichess')).toBeNull()
  })
})
