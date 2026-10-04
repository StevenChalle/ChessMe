import type { ChessComCategoryKey, ChessComPlayer } from '@/lib/chesscom/types'
import { formatGameCount, formatDate, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import type { PlayerUsernames } from '../search'
import { usePlayerAccounts } from '../usePlayerAccounts'
import { ExternalLink } from './ExternalLink'
import { Panel, StatTile } from './Panel'
import { ResultBar } from './ResultBar'
import { SourceStatus } from './SourceStatus'

// Labels are functions: they are evaluated at render time, in the current locale.
const CATEGORIES: { key: ChessComCategoryKey; label: () => string }[] = [
  { key: 'chess_bullet', label: m.category_bullet },
  { key: 'chess_blitz', label: m.category_blitz },
  { key: 'chess_rapid', label: m.category_rapid },
  // Chess.com brand names for correspondence chess
  { key: 'chess_daily', label: () => 'Daily' },
  { key: 'chess960_daily', label: () => 'Daily 960' },
]

const statusLabels = (): Record<string, string> => ({
  basic: 'Basic',
  premium: 'Premium',
  staff: 'Staff',
  mod: m.status_moderator(),
})

export function ChessComDetails({ usernames }: { usernames: PlayerUsernames }) {
  const { chesscom } = usePlayerAccounts(usernames)
  if (chesscom.status !== 'found') {
    return <SourceStatus source="chesscom" state={chesscom} />
  }
  return <ChessComPlayerDetails player={chesscom.data} />
}

function ChessComPlayerDetails({ player: { profile, stats } }: { player: ChessComPlayer }) {
  if (profile.status?.startsWith('closed')) {
    return <p className="text-bad">{m.chesscom_closed()}</p>
  }

  const categories = CATEGORIES.filter(({ key }) => stats[key]?.last)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={m.membership()} value={statusLabels()[profile.status ?? ''] ?? '—'} />
        <StatTile label={m.league()} value={profile.league ?? '—'} />
        <StatTile label={m.followers()} value={formatNumber(profile.followers ?? 0)} />
        <StatTile label={m.fide_declared()} value={stats.fide || '—'} />
      </div>

      {categories.length === 0 ? (
        <Panel title={m.ratings()}>
          <p className="text-sm text-muted-foreground">{m.no_rated_games()}</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map(({ key, label }) => {
            const { last, best, record } = stats[key]!
            return (
              <Panel
                key={key}
                title={label()}
                aside={record && formatGameCount(record.win + record.loss + record.draw)}
              >
                <div className="mb-3 flex items-baseline gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">{m.rating_current()}</div>
                    <div className="text-2xl font-medium text-font-clear tabular-nums">
                      {last!.rating}
                    </div>
                  </div>
                  {best && (
                    <div>
                      <div className="text-xs text-muted-foreground">{m.rating_best()}</div>
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
        <Panel title={m.puzzles()}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {stats.tactics?.highest && (
              <div>
                <dt className="text-xs text-muted-foreground">{m.tactics_best()}</dt>
                <dd className="text-xl font-medium text-font-clear tabular-nums">
                  {stats.tactics.highest.rating}
                </dd>
              </div>
            )}
            {stats.puzzle_rush?.best && (
              <div>
                <dt className="text-xs text-muted-foreground">{m.puzzle_rush_best()}</dt>
                <dd className="text-xl font-medium text-font-clear tabular-nums">
                  {stats.puzzle_rush.best.score}
                </dd>
              </div>
            )}
          </dl>
        </Panel>
      )}

      <p className="text-xs text-muted-foreground">{m.chesscom_data_delay()}</p>
    </div>
  )
}
