import { ScanSearch } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import type { ReviewAccount } from '../analyze'
import { ReviewDialog } from './ReviewDialog'

/** Opens the review of the latest games; the review runs while the dialog is open. */
export function ReviewButton({ accounts }: { accounts: ReviewAccount[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <ScanSearch data-icon="inline-start" />
        {m.review_button()}
      </Button>
      <ReviewDialog accounts={accounts} open={open} onOpenChange={setOpen} />
    </>
  )
}
