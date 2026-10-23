import { beforeEach, describe, expect, it } from 'vitest'
import {
  defaultDepth,
  getMainProfile,
  mainAccounts,
  parseMainProfile,
  setMainProfile,
} from './profile'

describe('parseMainProfile', () => {
  it('keeps the accounts and a known depth', () => {
    expect(parseMainProfile('{"lichess":" alice ","chesscom":"bob","depth":200}')).toEqual({
      lichess: 'alice',
      chesscom: 'bob',
      depth: 200,
      deep: true,
    })
    expect(parseMainProfile('{"lichess":"alice","depth":50,"deep":false}')?.deep).toBe(false)
  })

  it('needs an account, and falls back to the default depth', () => {
    expect(parseMainProfile('{"depth":50}')).toBeUndefined()
    expect(parseMainProfile('not json')).toBeUndefined()
    expect(parseMainProfile('{"lichess":"alice","depth":7}')?.depth).toBe(defaultDepth())
  })
})

describe('defaultDepth', () => {
  it('is 500 on a computer, 50 on a phone', () => {
    expect(defaultDepth('desktop')).toBe(500)
    expect(defaultDepth('mobile')).toBe(50)
  })
})

describe('setMainProfile', () => {
  beforeEach(() => localStorage.clear())

  it('saves the profile and forgets it', () => {
    setMainProfile({ chesscom: 'bob', depth: 1000, deep: false })
    expect(getMainProfile()).toEqual({ chesscom: 'bob', depth: 1000, deep: false })
    expect(localStorage.getItem('craftyourchess:main-profile')).toContain('bob')
    expect(mainAccounts(getMainProfile()!)).toEqual([{ source: 'chesscom', username: 'bob' }])
    setMainProfile(undefined)
    expect(getMainProfile()).toBeUndefined()
    expect(localStorage.getItem('craftyourchess:main-profile')).toBeNull()
  })
})
