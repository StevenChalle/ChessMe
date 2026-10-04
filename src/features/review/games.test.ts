import { describe, expect, it } from 'vitest'
import type { ChessComGame } from '@/lib/chesscom/types'
import type { LichessGame } from '@/lib/lichess/types'
import { MATE_CP } from './errors'
import {
  fromChessComGame,
  fromLichessGame,
  latestGames,
  parseChessComTimeControl,
  timeControlLabel,
  type ReviewGame,
} from './games'

function lichessGame(overrides: Partial<LichessGame> = {}): LichessGame {
  return {
    id: 'abcd1234',
    rated: true,
    variant: 'standard',
    speed: 'blitz',
    perf: 'blitz',
    createdAt: 1_700_000_000_000,
    lastMoveAt: 1_700_000_300_000,
    status: 'resign',
    players: {
      white: { user: { id: 'alice', name: 'Alice' }, rating: 1500 },
      black: { user: { id: 'bob', name: 'Bob' }, rating: 1600 },
    },
    winner: 'black',
    moves: 'e4 e5 Qh5',
    clock: { initial: 180, increment: 2, totalTime: 260 },
    ...overrides,
  }
}

function chessComGame(overrides: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: 'https://www.chess.com/game/live/1',
    uuid: 'uuid-1',
    pgn: '[Event "Live Chess"]\n\n1. e4 {[%clk 0:02:59]} 1... e5 2. Nf3 1-0',
    time_control: '180+2',
    time_class: 'blitz',
    rules: 'chess',
    rated: true,
    end_time: 1_700_000_000,
    white: { username: 'Alice', rating: 1200, result: 'win' },
    black: { username: 'bob', rating: 1250, result: 'resigned' },
    ...overrides,
  }
}

describe('fromLichessGame', () => {
  it('normalizes a game from the player side', () => {
    expect(fromLichessGame(lichessGame(), 'Alice')).toMatchObject({
      source: 'lichess',
      id: 'abcd1234',
      url: 'https://lichess.org/abcd1234',
      playedAt: new Date(1_700_000_300_000),
      category: 'blitz',
      timeControl: { kind: 'clock', initial: 180, increment: 2 },
      color: 'white',
      opponent: { name: 'Bob', rating: 1600 },
      result: 'loss',
      sanMoves: ['e4', 'e5', 'Qh5'],
      serverCps: undefined,
    })
  })

  it('handles black, draws and daily games', () => {
    const game = fromLichessGame(
      lichessGame({ winner: undefined, clock: undefined, daysPerTurn: 3, speed: 'correspondence' }),
      'bob',
    )
    expect(game).toMatchObject({
      color: 'black',
      url: 'https://lichess.org/abcd1234/black',
      result: 'draw',
      category: 'daily',
      timeControl: { kind: 'daily', days: 3 },
    })
  })

  it('reads the server analysis as White centipawns', () => {
    const game = fromLichessGame(
      lichessGame({ analysis: [{ eval: 20 }, { mate: -2 }, {}] }),
      'alice',
    )
    expect(game?.serverCps).toEqual([20, -MATE_CP, undefined])
  })

  it('skips unrated, variant and aborted games', () => {
    expect(fromLichessGame(lichessGame({ rated: false }), 'alice')).toBeUndefined()
    expect(fromLichessGame(lichessGame({ variant: 'chess960' }), 'alice')).toBeUndefined()
    expect(fromLichessGame(lichessGame({ status: 'aborted' }), 'alice')).toBeUndefined()
  })
})

describe('fromChessComGame', () => {
  it('normalizes a game from the player side, reading moves from the PGN', () => {
    expect(fromChessComGame(chessComGame(), 'bob')).toMatchObject({
      source: 'chesscom',
      id: 'uuid-1',
      playedAt: new Date(1_700_000_000_000),
      category: 'blitz',
      color: 'black',
      opponent: { name: 'Alice', rating: 1200 },
      result: 'loss',
      sanMoves: ['e4', 'e5', 'Nf3'],
      initialFen: undefined,
    })
  })

  it('recognizes draws', () => {
    const game = chessComGame({
      white: { username: 'Alice', rating: 1200, result: 'repetition' },
      black: { username: 'bob', rating: 1250, result: 'repetition' },
    })
    expect(fromChessComGame(game, 'alice')?.result).toBe('draw')
  })

  it('skips unrated and variant games', () => {
    expect(fromChessComGame(chessComGame({ rated: false }), 'bob')).toBeUndefined()
    expect(fromChessComGame(chessComGame({ rules: 'chess960' }), 'bob')).toBeUndefined()
  })
})

describe('time controls', () => {
  it('parses Chess.com time controls', () => {
    expect(parseChessComTimeControl('180+2')).toEqual({ kind: 'clock', initial: 180, increment: 2 })
    expect(parseChessComTimeControl('600')).toEqual({ kind: 'clock', initial: 600, increment: 0 })
    expect(parseChessComTimeControl('1/172800')).toEqual({ kind: 'daily', days: 2 })
  })

  it('labels them like the platforms do', () => {
    expect(timeControlLabel({ kind: 'clock', initial: 180, increment: 2 })).toBe('3+2')
    expect(timeControlLabel({ kind: 'clock', initial: 30, increment: 0 })).toBe('½+0')
    expect(timeControlLabel({ kind: 'clock', initial: 90, increment: 1 })).toBe('1.5+1')
    expect(timeControlLabel({ kind: 'daily', days: 3 })).toBe('3 d')
  })
})

describe('latestGames', () => {
  it('keeps the most recent games, all platforms together', () => {
    const at = (day: number) => ({ playedAt: new Date(2026, 0, day) }) as ReviewGame
    expect(latestGames([at(1), at(5), at(3)], 2)).toEqual([at(5), at(3)])
  })
})
