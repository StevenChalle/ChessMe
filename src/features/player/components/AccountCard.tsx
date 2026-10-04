import { formatMonthYear, formatRelative } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import { SOURCE_LABELS } from '../summary'
import type { SourceState } from '../usePlayerAccounts'
import { ExternalLink } from './ExternalLink'
import { Panel } from './Panel'
import { SourceLabel } from './SourceBadge'
import { SourceStatus } from './SourceStatus'

export function AccountCard({ source, state }: { source: ApiSource; state: SourceState<unknown> }) {
  if (state.status !== 'found') {
    return (
      <Panel title={<SourceLabel source={source} />}>
        <SourceStatus source={source} state={state} />
      </Panel>
    )
  }

  const { account } = state
  return (
    <Panel
      title={<SourceLabel source={source} />}
      aside={
        <ExternalLink href={account.url}>
          {m.view_on({ platform: SOURCE_LABELS[source] })}
        </ExternalLink>
      }
    >
      {account.closed ? (
        <p className="text-sm text-bad">
          {account.flagged ? m.account_closed_tos() : m.account_closed()}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{m.member_since()}</dt>
            <dd className="text-font-clear">
              {account.joinedAt ? formatMonthYear(account.joinedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{m.last_seen()}</dt>
            <dd className="text-font-clear">
              {account.lastSeenAt ? formatRelative(account.lastSeenAt) : '—'}
            </dd>
          </div>
        </dl>
      )}
    </Panel>
  )
}
