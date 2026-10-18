import { describe, expect, it } from 'vitest'
import { BOARD_PRESETS, parseBoardStyle } from './boardStyle'

describe('parseBoardStyle', () => {
  it('defaults to the Lichess style', () => {
    expect(parseBoardStyle(null)).toEqual(BOARD_PRESETS.lichess)
    expect(parseBoardStyle('not json')).toEqual(BOARD_PRESETS.lichess)
  })

  it('keeps valid fields and replaces invalid ones', () => {
    expect(parseBoardStyle(JSON.stringify({ board: 'blue', pieces: 'chessnut' }))).toEqual({
      board: 'blue',
      pieces: 'chessnut',
    })
    expect(parseBoardStyle(JSON.stringify({ board: 'pink', pieces: 'merida' }))).toEqual({
      board: 'brown',
      pieces: 'merida',
    })
  })
})
