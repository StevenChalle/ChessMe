import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { deviceProfile, estimateSeconds } from '@/features/review/estimate'
import type { ReviewGame } from '@/features/review/games'
import { loadReviewSettings } from '@/features/review/settings'
import { fetchProfile } from '@/lib/chesscom/client'
import { detectDevice } from '@/lib/device'
import { formatEstimate, formatNumber } from '@/lib/format'
import { orNullIfNotFound } from '@/lib/http'
import { fetchUser } from '@/lib/lichess/client'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { defaultDepth, DEPTHS, setMainProfile, useMainProfile, type Depth } from '../profile'

const INPUT_CLASS =
  'h-control w-full rounded-sm border border-input bg-field px-3 text-sm text-text-strong outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none'

/** A typical game for the estimate: about 40 moves, no Lichess analysis. */
const TYPICAL_GAME = { sanMoves: Array.from({ length: 80 }, () => '') } as Pick<
  ReviewGame,
  'sanMoves' | 'serverCps'
>

/** Engine time to analyse `depth` games on this device, the first time. */
function depthEstimate(depth: Depth): string {
  const games = Array.from({ length: depth }, () => TYPICAL_GAME)
  const { criteria } = loadReviewSettings(['lichess', 'chesscom'])
  return formatEstimate(estimateSeconds(games, criteria, deviceProfile(detectDevice())))
}

type Check = 'idle' | 'checking' | 'saved' | { unknown: ('lichess' | 'chesscom')[] } | 'failed'

/**
 * The player's main accounts and how many of their latest games to keep analysed in the
 * background (docs/background-analysis.md). The accounts are checked before saving.
 */
export function MainProfileSettings() {
  const profile = useMainProfile()
  const [lichess, setLichess] = useState(profile?.lichess ?? '')
  const [chesscom, setChesscom] = useState(profile?.chesscom ?? '')
  const [depth, setDepth] = useState<Depth>(profile?.depth ?? defaultDepth())
  const [check, setCheck] = useState<Check>('idle')

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const names = { lichess: lichess.trim(), chesscom: chesscom.trim() }
    if (!names.lichess && !names.chesscom) return
    setCheck('checking')
    try {
      const [lichessUser, chesscomProfile] = await Promise.all([
        names.lichess ? orNullIfNotFound(fetchUser(names.lichess)) : undefined,
        names.chesscom ? orNullIfNotFound(fetchProfile(names.chesscom)) : undefined,
      ])
      const unknown = [
        ...(lichessUser === null || lichessUser?.disabled ? (['lichess'] as const) : []),
        ...(chesscomProfile === null ? (['chesscom'] as const) : []),
      ]
      if (unknown.length > 0) {
        setCheck({ unknown })
        return
      }
      setMainProfile({
        ...(lichessUser && { lichess: lichessUser.username }),
        ...(names.chesscom && { chesscom: names.chesscom }),
        depth,
      })
      if (lichessUser) setLichess(lichessUser.username)
      setCheck('saved')
    } catch {
      setCheck('failed')
    }
  }

  const remove = () => {
    setMainProfile(undefined)
    setLichess('')
    setChesscom('')
    setCheck('idle')
  }

  const unknown = typeof check === 'object' ? check.unknown : []

  return (
    <form className="space-y-3 text-sm" onSubmit={(event) => void save(event)}>
      <p className="text-xs text-muted-foreground">{m.settings_main_hint()}</p>
      <div className="space-y-2">
        <input
          className={cn(INPUT_CLASS, unknown.includes('lichess') && 'border-loss')}
          value={lichess}
          onChange={(event) => setLichess(event.target.value)}
          placeholder={m.search_username_placeholder({ platform: 'Lichess' })}
          aria-label={m.search_username_placeholder({ platform: 'Lichess' })}
          autoComplete="off"
          spellCheck={false}
        />
        <input
          className={cn(INPUT_CLASS, unknown.includes('chesscom') && 'border-loss')}
          value={chesscom}
          onChange={(event) => setChesscom(event.target.value)}
          placeholder={m.search_username_placeholder({ platform: 'Chess.com' })}
          aria-label={m.search_username_placeholder({ platform: 'Chess.com' })}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="pb-1.5 text-xs text-muted-foreground">{m.settings_main_depth()}</legend>
        <div className="grid grid-cols-2 gap-2">
          {DEPTHS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={depth === item}
              onClick={() => setDepth(item)}
              className={cn(
                'rounded-md border border-border px-2 py-1.5 text-left transition-colors hover:bg-muted',
                depth === item && 'ring-2 ring-primary',
              )}
            >
              <span className="block tabular-nums">{formatNumber(item)}</span>
              <span className="block text-xs text-muted-foreground">{depthEstimate(item)}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {unknown.length > 0 && <p className="text-xs text-loss">{m.settings_main_unknown()}</p>}
      {check === 'failed' && <p className="text-xs text-loss">{m.settings_main_failed()}</p>}
      {check === 'saved' && (
        <p className="text-xs text-win" role="status">
          {m.settings_main_saved()}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={check === 'checking' || (!lichess.trim() && !chesscom.trim())}
        >
          {check === 'checking' ? m.settings_main_checking() : m.settings_main_save()}
        </Button>
        {profile && (
          <Button type="button" variant="outline" size="sm" onClick={remove}>
            {m.settings_main_remove()}
          </Button>
        )}
      </div>
    </form>
  )
}
