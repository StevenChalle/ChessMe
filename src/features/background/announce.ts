import { SOURCE_LABELS } from '@/features/player/summary'
import { showToast } from '@/lib/toast'
import { m } from '@/paraglide/messages'
import { mainAccounts, type MainProfile } from './profile'

/** A notification once main accounts are set: short, the platforms on one line. */
export function announceMainAccounts(profile: MainProfile): void {
  const accounts = mainAccounts(profile).map(({ source, username }) =>
    m.toast_account_line({ platform: SOURCE_LABELS[source], username }),
  )
  showToast(m.toast_main_accounts_set(), [accounts.join(' - ')])
}
