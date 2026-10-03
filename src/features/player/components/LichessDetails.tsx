import { formatCount, formatHours, formatNumber } from '@/lib/format'
import type { LichessUser, PerfKey } from '@/lib/lichess/types'
import type { PlayerUsernames } from '../search'
import { usePlayerAccounts } from '../usePlayerAccounts'
import { Panel, StatTile } from './Panel'
import { ResultBar } from './ResultBar'
import { SourceStatus } from './SourceStatus'

const RATED_PERFS: { key: PerfKey; label: string }[] = [
  { key: 'ultraBullet', label: 'UltraBullet' },
  { key: 'bullet', label: 'Bullet' },
  { key: 'blitz', label: 'Blitz' },
  { key: 'rapid', label: 'Rapide' },
  { key: 'classical', label: 'Classique' },
  { key: 'correspondence', label: 'Correspondance' },
  { key: 'chess960', label: 'Chess960' },
  { key: 'kingOfTheHill', label: 'Roi de la colline' },
  { key: 'threeCheck', label: 'Trois échecs' },
  { key: 'antichess', label: 'Antichess' },
  { key: 'atomic', label: 'Atomique' },
  { key: 'horde', label: 'Horde' },
  { key: 'racingKings', label: 'Course de rois' },
  { key: 'crazyhouse', label: 'Crazyhouse' },
  { key: 'puzzle', label: 'Problèmes' },
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
  if (user.disabled) return <p className="text-bad">Ce compte Lichess est fermé.</p>

  const perfs = RATED_PERFS.filter(({ key }) => user.perfs?.[key]?.games)
  const puzzleModes = PUZZLE_MODES.filter(({ key }) => user.perfs?.[key]?.runs)
  const { profile, count, playTime } = user

  return (
    <div className="space-y-4">
      {user.tosViolation && (
        <p className="text-sm text-bad">
          Ce compte a enfreint les conditions d’utilisation de Lichess.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Parties" value={formatNumber(count?.all ?? 0)} />
        <StatTile label="Classées" value={formatNumber(count?.rated ?? 0)} />
        <StatTile label="Temps de jeu" value={playTime ? formatHours(playTime.total) : '—'} />
        <StatTile label="Elo FIDE déclaré" value={profile?.fideRating ?? '—'} />
      </div>

      {count && (
        <Panel title="Bilan" aside="Toutes parties confondues">
          <ResultBar record={count} />
        </Panel>
      )}

      <Panel title="Classements">
        {perfs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune partie classée.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {perfs.map(({ key, label }) => {
              const perf = user.perfs![key]!
              return (
                <li key={key} className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
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
                    {formatCount(perf.games ?? 0, 'partie')}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {puzzleModes.length > 0 && (
        <Panel title="Records de problèmes">
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
        <Panel title="Profil">
          {profile.realName && <p className="text-font-clear">{profile.realName}</p>}
          {profile.location && <p className="text-sm text-muted-foreground">{profile.location}</p>}
          {profile.bio && <p className="mt-2 text-sm whitespace-pre-line">{profile.bio}</p>}
        </Panel>
      )}
    </div>
  )
}
