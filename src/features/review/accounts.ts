import type { AccountSummary } from '@/features/player/summary'
import type { GameCounts } from './components/ReviewSetup'
import type { ReviewAccount } from './fetch'

/**
 * The accounts that can be analysed (closed ones have no games), and their rated games per time
 * control, shown as an indication in the filters.
 */
export function reviewableAccounts(accounts: AccountSummary[]): {
  accounts: ReviewAccount[]
  gameCounts: GameCounts
} {
  const open = accounts.filter((account) => !account.closed)
  return {
    accounts: open.map(({ source, username }) => ({ source, username })),
    gameCounts: Object.fromEntries(
      open.map(({ source, categories }) => [
        source,
        Object.fromEntries(Object.entries(categories).map(([key, stats]) => [key, stats.games])),
      ]),
    ),
  }
}
