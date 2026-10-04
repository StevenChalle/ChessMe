import { History, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import type { ReviewAccount } from '../fetch'
import { ReviewDialog, type ReviewMode } from './ReviewDialog'
import type { GameCounts } from './ReviewSetup'

/**
 * The quick review of the last game, and the advanced review (filters, then analysis).
 * Both run in a dialog, while it is open.
 */
export function ReviewButtons({
  accounts,
  gameCounts,
}: {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
}) {
  const [mode, setMode] = useState<ReviewMode | undefined>()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={() => setMode('quick')}>
        <History data-icon="inline-start" />
        {m.review_button_last()}
      </Button>
      <Button size="lg" onClick={() => setMode('advanced')}>
        <SlidersHorizontal data-icon="inline-start" />
        {m.review_button()}
      </Button>
      {mode && (
        <ReviewDialog
          accounts={accounts}
          gameCounts={gameCounts}
          mode={mode}
          open
          onOpenChange={(open) => {
            if (!open) setMode(undefined)
          }}
        />
      )}
    </div>
  )
}
