import { Link } from '@tanstack/react-router'
import { History, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlayerUsernames } from '@/features/player/search'
import { m } from '@/paraglide/messages'

/**
 * Profile header: the quick review of the last game (straight to the results tab), or the
 * analysis tab with its filters.
 */
export function ReviewButtons({ usernames }: { usernames: PlayerUsernames }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" asChild>
        <Link to="/player/results" search={{ ...usernames, start: 'last' }} resetScroll={false}>
          <History data-icon="inline-start" />
          {m.review_button_last()}
        </Link>
      </Button>
      {/* One main action per screen: the quick one */}
      <Button size="lg" variant="secondary" asChild>
        <Link to="/player/analysis" search={usernames} resetScroll={false}>
          <SlidersHorizontal data-icon="inline-start" />
          {m.review_button()}
        </Link>
      </Button>
    </div>
  )
}
