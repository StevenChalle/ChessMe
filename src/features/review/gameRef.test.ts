import { describe, expect, it } from 'vitest'
import type { GameSummary } from '@/features/games/normalize'
import { gameRef, parseGameRef } from './gameRef'

const game = (source: GameSummary['source'], id: string, playedAt: string) =>
  ({ source, id, playedAt: new Date(playedAt) }) as GameSummary

describe('gameRef', () => {
  it('writes Lichess games by id, Chess.com games with their UTC month', () => {
    expect(gameRef(game('lichess', 'abcd1234', '2026-10-01T00:00:00Z'))).toBe('lichess:abcd1234')
    expect(gameRef(game('chesscom', 'f00-ba4', '2026-03-31T23:30:00Z'))).toBe(
      'chesscom:2026-03:f00-ba4',
    )
  })

  it('reads back what it writes, and nothing else', () => {
    expect(parseGameRef('lichess:abcd1234')).toEqual({ source: 'lichess', id: 'abcd1234' })
    expect(parseGameRef('chesscom:2026-03:f00-ba4')).toEqual({
      source: 'chesscom',
      id: 'f00-ba4',
      year: 2026,
      month: 3,
    })
    expect(parseGameRef('lichess:../api')).toBeUndefined()
    expect(parseGameRef('chesscom:2026-13:x')).toBeUndefined()
    expect(parseGameRef(42)).toBeUndefined()
  })
})
