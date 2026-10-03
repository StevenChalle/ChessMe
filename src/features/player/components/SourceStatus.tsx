import type { ApiSource } from '@/lib/http'
import { sourceErrorMessage } from '../sources'
import { SOURCE_LABELS } from '../summary'
import type { SourceState } from '../usePlayerAccounts'

/** Placeholder for a source that is not available (not linked, loading, missing or failed). */
export function SourceStatus({
  source,
  state,
}: {
  source: ApiSource
  state: Exclude<SourceState<unknown>, { status: 'found' }>
}) {
  const label = SOURCE_LABELS[source]
  switch (state.status) {
    case 'unlinked':
      return <p className="text-sm text-muted-foreground">Aucun compte {label} lié.</p>
    case 'loading':
      return <p className="text-sm text-muted-foreground">Chargement…</p>
    case 'error':
      return <p className="text-sm text-bad">{sourceErrorMessage(source, state.error)}</p>
    case 'missing':
      return (
        <p className="text-sm text-muted-foreground">
          Aucun compte {label} « {state.username} ».
        </p>
      )
  }
}
