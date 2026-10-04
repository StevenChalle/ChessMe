import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { countryName } from '@/lib/format'
import { m } from '@/paraglide/messages'
import type { PlayerUsernames } from '../search'
import { SOURCE_LABELS, type AccountSummary } from '../summary'
import { SourceDot } from './SourceBadge'

/**
 * Name, titles, avatar and country, gathered from whichever accounts were found; `actions` on the
 * right. With `profileLink`, the name leads back to the profile of these accounts.
 */
export function PlayerHeader({
  accounts,
  actions,
  profileLink,
}: {
  accounts: AccountSummary[]
  actions?: ReactNode
  profileLink?: PlayerUsernames
}) {
  const avatarUrl = accounts.find((account) => account.avatarUrl)?.avatarUrl
  const country = accounts.map((account) => countryName(account.countryCode)).find(Boolean)
  const titles = accounts.filter((account) => account.title)
  const sameTitle =
    titles.length > 1 && titles.every((account) => account.title === titles[0]!.title)
  const sameName =
    accounts.length > 1 &&
    accounts.every(
      (account) => account.username.toLowerCase() === accounts[0]!.username.toLowerCase(),
    )
  const [main, ...others] = accounts

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {avatarUrl && (
          <img src={avatarUrl} alt="" className="size-14 rounded-md bg-card object-cover" />
        )}
        <div>
          <h1 className="flex flex-wrap items-baseline gap-x-2 text-3xl font-medium text-font-clear">
            {(sameTitle ? titles.slice(0, 1) : titles).map((account) => (
              <span
                key={account.source}
                className="text-brag"
                title={
                  sameTitle
                    ? undefined
                    : m.player_title_on({ platform: SOURCE_LABELS[account.source] })
                }
              >
                {account.title}
              </span>
            ))}
            {profileLink ? (
              <Link to="/player" search={profileLink} className="hover:text-primary">
                {main?.username}
              </Link>
            ) : (
              main?.username
            )}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {country && <span>{country}</span>}
            {!sameName &&
              accounts.length > 1 &&
              [main!, ...others].map((account) => (
                <span key={account.source} className="inline-flex items-center gap-1.5">
                  <SourceDot source={account.source} />
                  {account.username}
                </span>
              ))}
          </p>
        </div>
      </div>
      {actions}
    </div>
  )
}
