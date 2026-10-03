import type { ChessComCategoryKey, ChessComPlayer } from '@/lib/chesscom/types'
import { formatCount, formatDate, formatNumber } from '@/lib/format'
import type { PlayerUsernames } from '../search'
import { usePlayerAccounts } from '../usePlayerAccounts'
import { ExternalLink } from './ExternalLink'
import { Panel, StatTile } from './Panel'
import { ResultBar } from './ResultBar'
import { SourceStatus } from './SourceStatus'

const CATEGORIES: { key: ChessComCategoryKey; label: string }[] = [
  { key: 'chess_bullet', label: 'Bullet' },
  { key: 'chess_blitz', label: 'Blitz' },
  { key: 'chess_rapid', label: 'Rapide' },
  { key: 'chess_daily', label: 'Daily' },
  { key: 'chess960_daily', label: 'Daily 960' },
]

const STATUS_LABELS: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  staff: 'Staff',
  mod: 'Modérateur',
}

export function ChessComDetails({ usernames }: { usernames: PlayerUsernames }) {
  const { chesscom } = usePlayerAccounts(usernames)
  if (chesscom.status !== 'found') {
    return <SourceStatus source="chesscom" state={chesscom} />
  }
  return <ChessComPlayerDetails player={chesscom.data} />
}

function ChessComPlayerDetails({ player: { profile, stats } }: { player: ChessComPlayer }) {
  if (profile.status?.startsWith('closed')) {
    return <p className="text-bad">Ce compte Chess.com est fermé.</p>
  }

  const categories = CATEGORIES.filter(({ key }) => stats[key]?.last)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Abonnement" value={STATUS_LABELS[profile.status ?? ''] ?? '—'} />
        <StatTile label="Ligue" value={profile.league ?? '—'} />
        <StatTile label="Abonnés" value={formatNumber(profile.followers ?? 0)} />
        <StatTile label="Elo FIDE déclaré" value={stats.fide || '—'} />
      </div>

      {categories.length === 0 ? (
        <Panel title="Classements">
          <p className="text-sm text-muted-foreground">Aucune partie classée.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map(({ key, label }) => {
            const { last, best, record } = stats[key]!
            return (
              <Panel
                key={key}
                title={label}
                aside={record && formatCount(record.win + record.loss + record.draw, 'partie')}
              >
                <div className="mb-3 flex items-baseline gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Actuel</div>
                    <div className="text-2xl font-medium text-font-clear tabular-nums">
                      {last!.rating}
                    </div>
                  </div>
                  {best && (
                    <div>
                      <div className="text-xs text-muted-foreground">Meilleur</div>
                      <div className="text-lg text-font-clear tabular-nums">
                        {best.rating}
                        <ExternalLink href={best.game} className="ml-2 text-xs font-normal">
                          {formatDate(new Date(best.date * 1000))}
                        </ExternalLink>
                      </div>
                    </div>
                  )}
                </div>
                {record && <ResultBar record={record} />}
              </Panel>
            )
          })}
        </div>
      )}

      {(stats.tactics?.highest || stats.puzzle_rush?.best) && (
        <Panel title="Problèmes">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {stats.tactics?.highest && (
              <div>
                <dt className="text-xs text-muted-foreground">Tactiques (record)</dt>
                <dd className="text-xl font-medium text-font-clear tabular-nums">
                  {stats.tactics.highest.rating}
                </dd>
              </div>
            )}
            {stats.puzzle_rush?.best && (
              <div>
                <dt className="text-xs text-muted-foreground">Puzzle Rush (record)</dt>
                <dd className="text-xl font-medium text-font-clear tabular-nums">
                  {stats.puzzle_rush.best.score}
                </dd>
              </div>
            )}
          </dl>
        </Panel>
      )}
    </div>
  )
}
