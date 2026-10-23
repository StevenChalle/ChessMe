import { beforeEach, describe, expect, it } from 'vitest'
import {
  areMainAccounts,
  defaultDepth,
  depthsFor,
  getMainProfile,
  mainAccounts,
  parseMainProfile,
  replacedAccounts,
  setMainProfile,
  withMainAccounts,
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

  it('is one of the choices of each kind of device', () => {
    expect(depthsFor('desktop')).toEqual([50, 200, 500, 1000])
    expect(depthsFor('mobile')).toEqual([10, 25, 50, 150])
    expect(depthsFor('desktop')).toContain(defaultDepth('desktop'))
    expect(depthsFor('mobile')).toContain(defaultDepth('mobile'))
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

describe('making accounts the main ones', () => {
  const main = { lichess: 'Alice', chesscom: 'alice_cc', depth: 200, deep: false }
  const lichess = (username: string) => ({ source: 'lichess' as const, username })
  const chesscom = (username: string) => ({ source: 'chesscom' as const, username })

  it('knows when the accounts shown are exactly the main ones, whatever the case', () => {
    expect(areMainAccounts(main, [lichess('alice'), chesscom('ALICE_CC')])).toBe(true)
    expect(areMainAccounts(main, [lichess('alice')])).toBe(false)
    expect(areMainAccounts(undefined, [lichess('alice')])).toBe(false)
  })

  it('lists the main accounts that would be dropped', () => {
    expect(replacedAccounts(main, [lichess('alice'), chesscom('alice_cc')])).toEqual([])
    expect(replacedAccounts(main, [lichess('bob')])).toEqual([
      lichess('Alice'),
      chesscom('alice_cc'),
    ])
    expect(replacedAccounts(main, [lichess('ALICE')])).toEqual([chesscom('alice_cc')])
    expect(replacedAccounts(undefined, [lichess('bob')])).toEqual([])
  })

  it('keeps the other choices of the profile', () => {
    expect(withMainAccounts(main, [chesscom('bob')])).toEqual({
      chesscom: 'bob',
      depth: 200,
      deep: false,
    })
    expect(withMainAccounts(undefined, [lichess('bob')])).toEqual({
      lichess: 'bob',
      depth: defaultDepth(),
      deep: true,
    })
  })
})
