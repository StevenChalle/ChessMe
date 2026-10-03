import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, type ErrorComponentProps } from '@tanstack/react-router'
import { LichessError } from '@/lib/lichess/client'
import { userQueryOptions } from '@/lib/lichess/queries'
import type { PerfKey } from '@/lib/lichess/types'

export const Route = createFileRoute('/player/$username')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.username)),
  component: PlayerPage,
  pendingComponent: () => <p className="text-muted-foreground">Chargement…</p>,
  errorComponent: PlayerError,
})

const PERFS: { key: PerfKey; label: string }[] = [
  { key: 'bullet', label: 'Bullet' },
  { key: 'blitz', label: 'Blitz' },
  { key: 'rapid', label: 'Rapide' },
  { key: 'classical', label: 'Classique' },
  { key: 'correspondence', label: 'Correspondance' },
  { key: 'puzzle', label: 'Problèmes' },
]

function PlayerPage() {
  const { username } = Route.useParams()
  const { data: user } = useSuspenseQuery(userQueryOptions(username))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-medium text-font-clear">
        {user.title && <span className="mr-2 text-brag">{user.title}</span>}
        {user.username}
      </h1>
      {user.disabled && <p className="text-bad">Ce compte est fermé.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PERFS.map(({ key, label }) => {
          const perf = user.perfs?.[key]
          return (
            <li key={key} className="rounded-md bg-card p-4">
              <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
              <div className="mt-1 text-2xl font-medium text-font-clear tabular-nums">
                {perf?.rating ?? '—'}
                {perf?.prov && <span className="text-muted-foreground">?</span>}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {perf?.games ?? 0} parties
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PlayerError({ error }: ErrorComponentProps) {
  const message =
    error instanceof LichessError && error.isNotFound
      ? 'Ce joueur n’existe pas sur Lichess.'
      : error instanceof LichessError && error.isRateLimited
        ? 'Trop de requêtes vers Lichess. Réessaie dans une minute.'
        : 'Impossible de charger ce joueur.'
  return <p className="text-bad">{message}</p>
}
