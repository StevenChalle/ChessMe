import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.brown.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type BoardProps = {
  config?: Config
  className?: string
}

/**
 * Thin React wrapper around chessground (the Lichess board).
 * Chessground owns its DOM: we create it once, then push config updates with api.set().
 */
export function Board({ config, className }: BoardProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)

  useEffect(() => {
    if (!elementRef.current) return
    const api = Chessground(elementRef.current, config)
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
    // Created once on mount; later config changes go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fenRef = useRef(config?.fen)
  useEffect(() => {
    const api = apiRef.current
    if (!config || !api) return
    api.set(config)
    // A new position: drop any piece still selected in the previous one (and its stale dests).
    if (config.fen !== fenRef.current) api.cancelMove()
    fenRef.current = config.fen
  }, [config])

  return (
    <div className={cn('aspect-square w-full', className)}>
      <div ref={elementRef} className="size-full" />
    </div>
  )
}
