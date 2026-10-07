import { Link } from '@tanstack/react-router'
import { History, SlidersHorizontal, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlayerUsernames } from '@/features/player/search'
import { m } from '@/paraglide/messages'
import { useAnalysisSession } from '../sessionContext'

/**
 * Profile header: both lead to the analysis page. The quick review skips the filters step and
 * starts right away on the last game.
 */
export function ReviewButtons({ usernames }: { usernames: PlayerUsernames }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" asChild>
        <Link to="/analysis/run" search={{ ...usernames, start: 'last' }}>
          <History data-icon="inline-start" />
          {m.review_button_last()}
        </Link>
      </Button>
      <Button size="lg" asChild>
        <Link to="/analysis" search={usernames}>
          <SlidersHorizontal data-icon="inline-start" />
          {m.review_button()}
        </Link>
      </Button>
    </div>
  )
}

/** Analysis page header: a new training on the errors of the analysis, set up in its own tab. */
export function AnalysisActions() {
  const { analysis, newTraining } = useAnalysisSession()
  const hasMistakes =
    analysis.status === 'done' && analysis.outcome.games.some((game) => game.mistakes.length > 0)
  return (
    <Button size="lg" disabled={!hasMistakes} onClick={newTraining}>
      <Swords data-icon="inline-start" />
      {m.training_new()}
    </Button>
  )
}
