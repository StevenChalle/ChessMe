import { useEffect, useState } from 'react'
import { useBackground } from '@/features/background/backgroundContext'
import type { GameSummary } from '@/features/games/normalize'
import { RECIPE } from './analyze'
import { analysedRefs } from './cache'
import { gameRef } from './gameRef'

/**
 * The references (gameRef) of these games already analysed: ready to train on. Looked up again
 * when the games change and as the background analysis moves.
 */
export function useAnalysedRefs(games: GameSummary[]): Set<string> {
  const [analysed, setAnalysed] = useState<Set<string>>(() => new Set())
  const done = useBackground()?.state.done
  const refs = games.map(gameRef)
  const key = refs.join()

  useEffect(() => {
    let current = true
    void analysedRefs(refs, RECIPE).then((found) => {
      if (current) setAnalysed(found)
    })
    return () => {
      current = false
    }
    // The references change with the games; looked up again as the background analysis moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, done])

  return analysed
}
