import { formatMonthYear, formatRelative } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
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
      aside={<ExternalLink href={account.url}>Voir sur {SOURCE_LABELS[source]}</ExternalLink>}
    >
      {account.closed ? (
        <p className="text-sm text-bad">
          Compte fermé{account.flagged && ' (violation des conditions d’utilisation)'}.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Membre depuis</dt>
            <dd className="text-font-clear">
              {account.joinedAt ? formatMonthYear(account.joinedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dernière connexion</dt>
            <dd className="text-font-clear">
              {account.lastSeenAt ? formatRelative(account.lastSeenAt) : '—'}
            </dd>
          </div>
        </dl>
      )}
    </Panel>
  )
}
