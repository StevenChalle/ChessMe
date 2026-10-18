import { useSyncExternalStore } from 'react'

/**
 * How boards look: their colors and their pieces, shared by every board on the page. Per browser
 * (localStorage): declared on the /legal page, cleared by clearLocalData().
 * Piece sets: free ones from Lichess's collection, compatible with the GPL (see /legal and
 * public/piece/LICENSES.md). Chess.com's own pieces are not free: its style uses Merida.
 */

export type BoardColor = 'brown' | 'blue' | 'green' | 'purple' | 'grey'
export type PieceSet = 'cburnett' | 'merida' | 'chessnut' | 'mpchess'
export type BoardStyle = { board: BoardColor; pieces: PieceSet }

export const BOARD_COLORS: BoardColor[] = ['brown', 'blue', 'green', 'purple', 'grey']
export const PIECE_SETS: PieceSet[] = ['cburnett', 'merida', 'chessnut', 'mpchess']

/** One click for a whole look: Lichess's (the default) or a Chess.com-like one. */
export const BOARD_PRESETS = {
  lichess: { board: 'brown', pieces: 'cburnett' },
  chesscom: { board: 'green', pieces: 'merida' },
} as const satisfies Record<string, BoardStyle>

const STORAGE_KEY = 'chessme:board-style'
const listeners = new Set<() => void>()

/** Saved style over the default, field by field. */
export function parseBoardStyle(raw: string | null): BoardStyle {
  const style: BoardStyle = { ...BOARD_PRESETS.lichess }
  try {
    const data = JSON.parse(raw ?? '{}') as Partial<Record<keyof BoardStyle, unknown>>
    const board = BOARD_COLORS.find((item) => item === data.board)
    const pieces = PIECE_SETS.find((item) => item === data.pieces)
    if (board) style.board = board
    if (pieces) style.pieces = pieces
  } catch {
    // Invalid: the default
  }
  return style
}

function read(): BoardStyle {
  try {
    return parseBoardStyle(localStorage.getItem(STORAGE_KEY))
  } catch {
    return { ...BOARD_PRESETS.lichess }
  }
}

let current: BoardStyle = read()

export function setBoardStyle(change: Partial<BoardStyle>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Not saved: still applies until the page is reloaded
  }
  for (const listener of listeners) listener()
}

export function useBoardStyle(): BoardStyle {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

/** A piece's image, for the settings menu (the board itself uses boardStyles.css). */
export function pieceImage(set: PieceSet, piece: string): string {
  return `/piece/${set}/${piece}.svg`
}
