import { History, ScanSearch } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { REVIEW_GAME_COUNT, type ReviewAccount } from '../analyze'
import { ReviewDialog } from './ReviewDialog'

/**
 * Opens the review of the latest games, or of the last game only; the review runs while the
 * dialog is open.
 */
export function ReviewButtons({ accounts }: { accounts: ReviewAccount[] }) {
  const [count, setCount] = useState<number | undefined>()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={() => setCount(1)}>
        <History data-icon="inline-start" />
        {m.review_button_last()}
      </Button>
      <Button size="lg" onClick={() => setCount(REVIEW_GAME_COUNT)}>
        <ScanSearch data-icon="inline-start" />
        {m.review_button()}
      </Button>
      <ReviewDialog
        accounts={accounts}
        count={count ?? REVIEW_GAME_COUNT}
        open={count !== undefined}
        onOpenChange={(open) => {
          if (!open) setCount(undefined)
        }}
      />
    </div>
  )
}
