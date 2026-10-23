import { SOURCE_LABELS } from '@/features/player/summary'
import { showToast } from '@/lib/toast'
import { m } from '@/paraglide/messages'
import { mainAccounts, type MainProfile } from './profile'

/** A notification once main accounts are set: short, one line per platform. */
export function announceMainAccounts(profile: MainProfile): void {
  showToast(
    m.toast_main_accounts_set(),
    mainAccounts(profile).map(({ source, username }) =>
      m.toast_account_line({ platform: SOURCE_LABELS[source], username }),
    ),
  )
}
