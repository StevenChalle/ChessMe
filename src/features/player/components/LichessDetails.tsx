import { formatGameCount, formatHours, formatNumber } from '@/lib/format'
import type { LichessUser, PerfKey } from '@/lib/lichess/types'
import { m } from '@/paraglide/messages'
import type { PlayerUsernames } from '../search'
import { usePlayerAccounts } from '../usePlayerAccounts'
import { Panel, StatTile } from './Panel'
import { ResultBar } from './ResultBar'
import { SourceStatus } from './SourceStatus'

// Labels are functions: they are evaluated at render time, in the current locale.
const brand = (name: string) => () => name

const RATED_PERFS: { key: PerfKey; label: () => string }[] = [
  { key: 'ultraBullet', label: brand('UltraBullet') },
  { key: 'bullet', label: m.category_bullet },
  { key: 'blitz', label: m.category_blitz },
  { key: 'rapid', label: m.category_rapid },
  { key: 'classical', label: m.category_classical },
  { key: 'correspondence', label: m.category_daily },
  { key: 'chess960', label: brand('Chess960') },
  { key: 'kingOfTheHill', label: m.perf_king_of_the_hill },
  { key: 'threeCheck', label: m.perf_three_check },
  { key: 'antichess', label: brand('Antichess') },
  { key: 'atomic', label: m.perf_atomic },
  { key: 'horde', label: brand('Horde') },
  { key: 'racingKings', label: m.perf_racing_kings },
  { key: 'crazyhouse', label: brand('Crazyhouse') },
  { key: 'puzzle', label: m.perf_puzzles },
]

const PUZZLE_MODES: { key: PerfKey; label: string }[] = [
  { key: 'storm', label: 'Puzzle Storm' },
  { key: 'racer', label: 'Puzzle Racer' },
  { key: 'streak', label: 'Puzzle Streak' },
]

export function LichessDetails({ usernames }: { usernames: PlayerUsernames }) {
  const { lichess } = usePlayerAccounts(usernames)
  if (lichess.status !== 'found') {
    return <SourceStatus source="lichess" state={lichess} />
  }
  return <LichessUserDetails user={lichess.data} />
}

function LichessUserDetails({ user }: { user: LichessUser }) {
  if (user.disabled) return <p className="text-bad">{m.lichess_closed()}</p>

  const perfs = RATED_PERFS.filter(({ key }) => user.perfs?.[key]?.games)
  const puzzleModes = PUZZLE_MODES.filter(({ key }) => user.perfs?.[key]?.runs)
  const { profile, count, playTime } = user

  return (
    <div className="space-y-4">
      {user.tosViolation && <p className="text-sm text-bad">{m.lichess_tos()}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={m.games()} value={formatNumber(count?.all ?? 0)} />
        <StatTile label={m.rated()} value={formatNumber(count?.rated ?? 0)} />
        <StatTile label={m.play_time()} value={playTime ? formatHours(playTime.total) : '—'} />
        <StatTile label={m.fide_declared()} value={profile?.fideRating ?? '—'} />
      </div>

      {count && (
        <Panel title={m.record()} aside={m.all_games()}>
          <ResultBar record={count} />
        </Panel>
      )}

      <Panel title={m.ratings()}>
        {perfs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.no_rated_games()}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {perfs.map(({ key, label }) => {
              const perf = user.perfs![key]!
              return (
                <li key={key} className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground">{label()}</div>
                  <div className="text-xl font-medium text-font-clear tabular-nums">
                    {perf.rating}
                    {perf.prov && <span className="text-muted-foreground">?</span>}
                    {perf.prog ? (
                      <span
                        className={`ml-1.5 text-xs ${perf.prog > 0 ? 'text-good' : 'text-bad'}`}
                      >
                        {perf.prog > 0 ? '+' : ''}
                        {perf.prog}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatGameCount(perf.games ?? 0)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {puzzleModes.length > 0 && (
        <Panel title={m.puzzle_records()}>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {puzzleModes.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xl font-medium text-font-clear tabular-nums">
                  {user.perfs![key]!.score}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {(profile?.bio || profile?.realName || profile?.location) && (
        <Panel title={m.profile()}>
          {profile.realName && <p className="text-font-clear">{profile.realName}</p>}
          {profile.location && <p className="text-sm text-muted-foreground">{profile.location}</p>}
          {profile.bio && <p className="mt-2 text-sm whitespace-pre-line">{profile.bio}</p>}
        </Panel>
      )}
    </div>
  )
}
