import { SOURCE_LABELS } from '@/features/player/summary'
import type { ReviewAccount } from '@/features/review/fetch'
import { showToast } from '@/lib/toast'
import { m } from '@/paraglide/messages'

/** One item per account: "Lichess: alice". */
const items = (accounts: ReviewAccount[]) =>
  accounts.map(({ source, username }) =>
    m.toast_account_line({ platform: SOURCE_LABELS[source], username }),
  )

/** A notification once a player is added to the favorites. */
export function announceFavorite(accounts: ReviewAccount[]): void {
  showToast(m.toast_favorite_added(), items(accounts))
}

/** A notification once a player leaves the favorites. */
export function announceUnfavorite(accounts: ReviewAccount[]): void {
  showToast(m.toast_favorite_removed(), items(accounts))
}
