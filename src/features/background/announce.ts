import { SOURCE_LABELS } from '@/features/player/summary'
import { formatAndList, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { m } from '@/paraglide/messages'
import { mainAccounts, type MainProfile } from './profile'

/** A notification once main accounts are set: which ones, and what follows. */
export function announceMainAccounts(profile: MainProfile): void {
  const accounts = mainAccounts(profile).map(
    ({ source, username }) => `${username} (${SOURCE_LABELS[source]})`,
  )
  showToast(
    m.toast_main_accounts_set({
      accounts: formatAndList(accounts),
      count: formatNumber(profile.depth),
    }),
  )
}
