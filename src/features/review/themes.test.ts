import { describe, expect, it } from 'vitest'
import { MATE_CP } from './errors'
import { mistakeThemes, themeCounts } from './themes'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const ROOK_ENDGAME = '8/5pk1/6p1/8/3R4/6P1/r4PK1/8 w - - 0 40'
const PAWN_ENDGAME = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 50'
const MINOR_ENDGAME = '8/5pk1/3n2p1/8/8/4B1P1/5PK1/8 w - - 0 45'
const QUEEN_ENDGAME = '8/5pk1/6p1/8/3Q4/6P1/q4PK1/8 w - - 0 45'
const MIXED_ENDGAME = '8/5pk1/3n2p1/8/3R4/6P1/5PK1/8 w - - 0 45'

/** An equal position in the middlegame, at move 20, losing a pawn and a half. */
const base = { fen: START, ply: 40, beforeCp: 0, afterCp: -150 }

describe('mistakeThemes', () => {
  it('tags nothing in an equal middlegame', () => {
    expect(mistakeThemes(base)).toEqual([])
  })

  it('counts the opening up to the chosen move', () => {
    // ply 22 and 23: move 12 (White, then Black); ply 24: move 13
    expect(mistakeThemes({ ...base, ply: 22 })).toContain('opening')
    expect(mistakeThemes({ ...base, ply: 23 })).toContain('opening')
    expect(mistakeThemes({ ...base, ply: 24 })).not.toContain('opening')
    expect(mistakeThemes({ ...base, ply: 24 }, 13)).toContain('opening')
  })

  it('tells an advantage from a worse position, by winning chances', () => {
    expect(mistakeThemes({ ...base, beforeCp: 150, afterCp: -100 })).toContain('advantage')
    expect(mistakeThemes({ ...base, beforeCp: 100, afterCp: -200 })).toEqual([])
    expect(mistakeThemes({ ...base, beforeCp: -150, afterCp: -400 })).toContain('resilience')
  })

  it('recognizes endgames and their kind', () => {
    expect(mistakeThemes({ ...base, fen: ROOK_ENDGAME })).toEqual(['endgame', 'rookEndgame'])
    expect(mistakeThemes({ ...base, fen: PAWN_ENDGAME })).toEqual(['endgame', 'pawnEndgame'])
    expect(mistakeThemes({ ...base, fen: MINOR_ENDGAME })).toEqual(['endgame', 'minorEndgame'])
    expect(mistakeThemes({ ...base, fen: QUEEN_ENDGAME })).toEqual(['endgame', 'queenEndgame'])
    expect(mistakeThemes({ ...base, fen: MIXED_ENDGAME })).toEqual(['endgame'])
  })

  it('finds missed mates and allowed mates', () => {
    expect(mistakeThemes({ ...base, beforeCp: MATE_CP, afterCp: 300 })).toContain('findMate')
    expect(mistakeThemes({ ...base, beforeCp: 50, afterCp: -MATE_CP })).toContain('avoidMate')
    // Already getting mated: nothing to avoid anymore
    expect(mistakeThemes({ ...base, beforeCp: -MATE_CP, afterCp: -MATE_CP })).not.toContain(
      'avoidMate',
    )
  })

  it('flags time trouble under a tenth of the expected game length', () => {
    expect(mistakeThemes({ ...base, clock: { remaining: 20, total: 260 } })).toContain(
      'timeTrouble',
    )
    expect(mistakeThemes({ ...base, clock: { remaining: 30, total: 260 } })).toEqual([])
  })
})

describe('themeCounts', () => {
  it('counts every theme of every error', () => {
    const counts = themeCounts([
      { ...base, fen: ROOK_ENDGAME, beforeCp: MATE_CP, afterCp: 300 },
      { ...base, fen: ROOK_ENDGAME },
      base,
    ])
    expect(counts.endgame).toBe(2)
    expect(counts.rookEndgame).toBe(2)
    expect(counts.findMate).toBe(1)
    expect(counts.advantage).toBe(1)
    expect(counts.opening).toBe(0)
  })
})
