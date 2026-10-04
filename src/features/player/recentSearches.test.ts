import { describe, expect, it } from 'vitest'
import { addRecentSearch, parseRecentSearches, removeRecentSearch } from './recentSearches'

describe('addRecentSearch', () => {
  it('puts the newest search first', () => {
    const list = addRecentSearch([], { lichess: 'a' }, 1)
    expect(addRecentSearch(list, { chesscom: 'b' }, 2)).toEqual([
      { chesscom: 'b', searchedAt: 2 },
      { lichess: 'a', searchedAt: 1 },
    ])
  })

  it('moves a repeated search to the top instead of duplicating it (case-insensitive)', () => {
    let list = addRecentSearch([], { lichess: 'Alice', chesscom: 'alice_c' }, 1)
    list = addRecentSearch(list, { lichess: 'bob' }, 2)
    list = addRecentSearch(list, { lichess: 'alice', chesscom: 'Alice_C' }, 3)
    expect(list).toEqual([
      { lichess: 'alice', chesscom: 'Alice_C', searchedAt: 3 },
      { lichess: 'bob', searchedAt: 2 },
    ])
  })

  it('treats a different account pairing as a different search', () => {
    let list = addRecentSearch([], { lichess: 'alice' }, 1)
    list = addRecentSearch(list, { lichess: 'alice', chesscom: 'alice' }, 2)
    expect(list).toHaveLength(2)
  })

  it('keeps at most 10 searches', () => {
    let list = addRecentSearch([], { lichess: 'p0' }, 0)
    for (let i = 1; i < 15; i++) list = addRecentSearch(list, { lichess: `p${i}` }, i)
    expect(list).toHaveLength(10)
    expect(list[0]?.lichess).toBe('p14')
  })

  it('ignores empty searches', () => {
    expect(addRecentSearch([], {}, 1)).toEqual([])
  })
})

describe('removeRecentSearch', () => {
  it('removes the matching search only', () => {
    const list = [
      { lichess: 'a', searchedAt: 2 },
      { chesscom: 'b', searchedAt: 1 },
    ]
    expect(removeRecentSearch(list, { lichess: 'A' })).toEqual([{ chesscom: 'b', searchedAt: 1 }])
  })
})

describe('parseRecentSearches', () => {
  it('survives missing or corrupted storage', () => {
    expect(parseRecentSearches(null)).toEqual([])
    expect(parseRecentSearches('not json')).toEqual([])
    expect(parseRecentSearches('{"a":1}')).toEqual([])
  })

  it('drops malformed entries', () => {
    const raw = JSON.stringify([{ lichess: 'a', searchedAt: 1 }, { searchedAt: 2 }, 'x', null])
    expect(parseRecentSearches(raw)).toEqual([{ lichess: 'a', searchedAt: 1 }])
  })
})
