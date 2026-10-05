import { totalGames, type AccountSummary } from '@/features/player/summary'
import type { ReviewAccount } from './fetch'

/**
 * The accounts that can be analysed (closed ones have no games), and how many games they played
 * in all, shown as an indication in the filters. Lichess counts every game; Chess.com only
 * publishes its rated games' records.
 */
export function reviewableAccounts(accounts: AccountSummary[]): {
  accounts: ReviewAccount[]
  gameTotal: number
} {
  const open = accounts.filter((account) => !account.closed)
  return {
    accounts: open.map(({ source, username }) => ({ source, username })),
    gameTotal: open.reduce(
      (sum, account) => sum + (account.record ? totalGames(account.record) : 0),
      0,
    ),
  }
}
