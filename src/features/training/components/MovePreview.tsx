import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { Color } from 'chessops'
import { HoverCard } from 'radix-ui'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Board } from '@/components/board/Board'
import { moveSquares, play, positionFromFen } from '../moves'

/**
 * Hovering a move shows the position after it on a small board, as in Lichess's analysis: the
 * player's own board and pieces, the move highlighted. On a touch screen (where a hover card
 * never opens by itself), a tap on the move shows it, and a tap anywhere else hides it.
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
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLAnchorElement>(null)
  // Opened by a tap: the next tap elsewhere closes it (a mouse leaving closes it by itself).
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])
  return (
    <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={80} closeDelay={0}>
      <HoverCard.Trigger
        asChild
        ref={triggerRef}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') setOpen((current) => !current)
        }}
      >
        {children}
      </HoverCard.Trigger>
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
