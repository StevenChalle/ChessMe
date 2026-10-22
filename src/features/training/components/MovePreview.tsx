import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { Color } from 'chessops'
import { HoverCard } from 'radix-ui'
import { useMemo, type ReactNode } from 'react'
import { Board } from '@/components/board/Board'
import { moveSquares, play, positionFromFen } from '../moves'

/**
 * Hovering a move shows the position after it on a small board, as in Lichess's analysis: the
 * player's own board and pieces, the move highlighted. Mouse only (a hover card never opens on
 * touch): on a phone, the moves stay plain text.
 */
export function MovePreview({
  fen,
  uci,
  orientation,
  children,
}: {
  /** The position before the move */
  fen: string
  uci: string
  orientation: Color
  /** The move as shown (its SAN): a single element */
  children: ReactNode
}) {
  return (
    <HoverCard.Root openDelay={80} closeDelay={0}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="left"
          sideOffset={12}
          className="pointer-events-none z-50 w-52 rounded-lg border border-border bg-popover p-1 shadow-pop duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <PreviewBoard fen={fen} uci={uci} orientation={orientation} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

function PreviewBoard({ fen, uci, orientation }: { fen: string; uci: string; orientation: Color }) {
  const config = useMemo((): Config => {
    const after = play(fen, uci).fen
    const position = positionFromFen(after)
    return {
      fen: after,
      orientation,
      viewOnly: true,
      coordinates: false,
      lastMove: moveSquares(uci) as [Key, Key],
      check: position.isCheck() ? position.turn : false,
    }
  }, [fen, uci, orientation])
  return <Board config={config} className="rounded-sm" />
}
