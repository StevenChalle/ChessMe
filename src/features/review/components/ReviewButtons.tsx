import { Link } from '@tanstack/react-router'
import { History, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProfileSearch } from '@/features/player/search'
import { m } from '@/paraglide/messages'

const BUTTON_CLASS =
  'max-sm:h-auto max-sm:min-h-control max-sm:py-2 max-sm:text-center max-sm:whitespace-normal'

/**
 * Profile header: the quick review of the last game (straight to the results tab), or the
 * analysis tab with its filters.
 */
export function ReviewButtons({ usernames }: { usernames: ProfileSearch }) {
  return (
    // Same width, side by side, on a phone too: there the labels may wrap onto two lines.
    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
      <Button size="lg" asChild className={BUTTON_CLASS}>
        <Link to="/player/results" search={{ ...usernames, start: 'last' }} resetScroll={false}>
          <History data-icon="inline-start" />
          {m.review_button_last()}
        </Link>
      </Button>
      {/* One main action per screen: the quick one */}
      <Button size="lg" variant="secondary" asChild className={BUTTON_CLASS}>
        <Link to="/player/analysis" search={usernames} resetScroll={false}>
          <SlidersHorizontal data-icon="inline-start" />
          {m.review_button()}
        </Link>
      </Button>
    </div>
  )
}
