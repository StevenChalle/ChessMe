import { beforeEach, describe, expect, it } from 'vitest'
import {
  defaultDepth,
  depthRange,
  favoriteAccounts,
  defaultOptions,
  favoriteIndex,
  getFavorites,
  isFavorite,
  isValidDepth,
  parseFavorites,
  parseLegacyMainProfile,
  playerAccounts,
  playerName,
  setFavorites,
  withFavorite,
  withOptions,
  withoutFavorite,
} from './favorites'

const lichess = (username: string) => ({ source: 'lichess' as const, username })
const chesscom = (username: string) => ({ source: 'chesscom' as const, username })

describe('parseFavorites', () => {
  it('keeps the valid players, each with their options', () => {
    expect(
      parseFavorites(
        '{"players":[{"lichess":" alice ","depth":200,"deep":false},{"chesscom":"bob","depth":1000},{"nope":1}]}',
      ),
    ).toEqual({
      players: [
        { lichess: 'alice', depth: 200, deep: false },
        { chesscom: 'bob', depth: 1000, deep: true },
      ],
    })
  })

  it('gives each player the options once shared by all the favorites', () => {
    expect(
      parseFavorites(
        '{"players":[{"lichess":"a"},{"chesscom":"b","depth":50}],"depth":200,"deep":false}',
      ),
    ).toEqual({
      players: [
        { lichess: 'a', depth: 200, deep: false },
        { chesscom: 'b', depth: 50, deep: false },
      ],
    })
  })

  it('needs a player, and falls back to the default depth', () => {
    expect(parseFavorites('{"players":[],"depth":50}')).toBeUndefined()
    expect(parseFavorites('not json')).toBeUndefined()
    expect(parseFavorites('{"players":[{"lichess":"a","depth":7}]}')).toEqual({
      players: [{ lichess: 'a', depth: defaultDepth(), deep: true }],
    })
  })

  it('takes the main accounts saved before favorites as the first favorite', () => {
    expect(
      parseLegacyMainProfile('{"lichess":"alice","chesscom":"alice","depth":500,"deep":true}'),
    ).toEqual({ players: [{ lichess: 'alice', chesscom: 'alice', depth: 500, deep: true }] })
    expect(parseLegacyMainProfile('{"depth":50}')).toBeUndefined()
  })
})

describe('depths', () => {
  it('has the default among the landmarks of each kind of device', () => {
    expect(depthRange('desktop').marks).toContain(defaultDepth('desktop'))
    expect(depthRange('mobile').marks).toContain(defaultDepth('mobile'))
    expect(defaultDepth('desktop')).toBe(500)
    expect(defaultDepth('mobile')).toBe(50)
  })

  it('takes any step of the range, landmarks or not', () => {
    const desktop = depthRange('desktop')
    expect([50, 350, 1000].every((depth) => isValidDepth(depth, desktop))).toBe(true)
    expect([0, 75, 1050, '500'].some((depth) => isValidDepth(depth, desktop))).toBe(false)
    const mobile = depthRange('mobile')
    expect(mobile.marks.every((mark) => isValidDepth(mark, mobile))).toBe(true)
  })
})

describe('setFavorites', () => {
  beforeEach(() => localStorage.clear())

  it('saves the favorites and forgets them', () => {
    const favorites = { players: [{ chesscom: 'bob', depth: 1000, deep: false }] }
    setFavorites(favorites)
    expect(getFavorites()).toEqual(favorites)
    expect(localStorage.getItem('craftyourchess:favorites')).toContain('bob')
    setFavorites(undefined)
    expect(getFavorites()).toBeUndefined()
    expect(localStorage.getItem('craftyourchess:favorites')).toBeNull()
  })
})

describe('adding and removing favorites', () => {
  const options = { depth: 200, deep: false }
  const favorites = {
    players: [
      { lichess: 'Alice', chesscom: 'alice_cc', ...options },
      { lichess: 'bob', depth: 1000, deep: true },
    ],
  }

  it('lists every account once', () => {
    const twice = { players: [...favorites.players, { lichess: 'BOB', ...options }] }
    expect(favoriteAccounts(twice)).toEqual([
      lichess('Alice'),
      chesscom('alice_cc'),
      lichess('bob'),
    ])
  })

  it('knows when every account shown is a favorite, whatever the case', () => {
    expect(isFavorite(favorites, [lichess('alice'), chesscom('ALICE_CC')])).toBe(true)
    expect(isFavorite(favorites, [lichess('bob')])).toBe(true)
    expect(isFavorite(favorites, [lichess('bob'), chesscom('bob')])).toBe(false)
    expect(isFavorite(undefined, [lichess('bob')])).toBe(false)
  })

  it('adds a new player last, with the default options or those chosen', () => {
    expect(withFavorite(favorites, [lichess('carol')]).players.at(-1)).toEqual({
      lichess: 'carol',
      ...defaultOptions(),
    })
    expect(withFavorite(undefined, [lichess('carol')], options)).toEqual({
      players: [{ lichess: 'carol', ...options }],
    })
  })

  it('completes the same player, with the options chosen', () => {
    // Bob seen with his Chess.com account too: still one player.
    expect(favoriteIndex(favorites, [lichess('bob'), chesscom('bob_cc')])).toBe(1)
    expect(withFavorite(favorites, [lichess('bob'), chesscom('bob_cc')], options).players).toEqual([
      favorites.players[0],
      { lichess: 'bob', chesscom: 'bob_cc', ...options },
    ])
    // Another Lichess account with Alice's Chess.com one: a new player, not a merge.
    expect(favoriteIndex(favorites, [lichess('eve'), chesscom('alice_cc')])).toBe(-1)
    expect(withFavorite(favorites, [lichess('eve'), chesscom('alice_cc')]).players).toHaveLength(3)
  })

  it("changes one player's options only", () => {
    expect(withOptions(favorites, 1, { deep: false }).players).toEqual([
      favorites.players[0],
      { lichess: 'bob', depth: 1000, deep: false },
    ])
  })

  it('removes accounts, then the players left with none, then the favorites', () => {
    // The account kept keeps the player's options.
    expect(withoutFavorite(favorites, [chesscom('ALICE_CC')])?.players).toEqual([
      { lichess: 'Alice', ...options },
      favorites.players[1],
    ])
    expect(withoutFavorite(favorites, [lichess('bob')])?.players).toEqual([favorites.players[0]])
    expect(withoutFavorite({ players: [favorites.players[1]!] }, [lichess('bob')])).toBe(undefined)
  })

  it('names a player once when both accounts share the name', () => {
    expect(playerName({ lichess: 'Alice', chesscom: 'alice' })).toBe('Alice')
    expect(playerName({ lichess: 'Alice', chesscom: 'alice_cc' })).toBe('Alice · alice_cc')
    expect(playerAccounts({ chesscom: 'bob' })).toEqual([chesscom('bob')])
  })
})
