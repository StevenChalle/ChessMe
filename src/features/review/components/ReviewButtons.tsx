import { Link } from '@tanstack/react-router'
import { History, SlidersHorizontal, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlayerUsernames } from '@/features/player/search'
import { formatNumber } from '@/lib/format'
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

/** Analysis page header: a new quick review, and replaying every error of the analysis. */
export function AnalysisActions() {
  const { analysis, quickLast, train } = useAnalysisSession()
  const mistakes =
    analysis.status === 'done' ? analysis.outcome.games.flatMap((game) => game.mistakes) : []
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={() => void quickLast()}>
        <History data-icon="inline-start" />
        {m.review_button_last()}
      </Button>
      <Button size="lg" disabled={mistakes.length === 0} onClick={() => void train(mistakes)}>
        <Swords data-icon="inline-start" />
        {m.training_start({ count: formatNumber(mistakes.length) })}
      </Button>
    </div>
  )
}
