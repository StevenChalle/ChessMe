import type { Color } from 'chessops'
import { useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CHIP_CLASS } from '@/components/chip'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate, formatGameCount, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import {
  missingInfo,
  playerNames,
  sideOf,
  toReviewGame,
  type IgnoredGames,
  type PgnBatch,
  type PgnGame,
} from '../pgn'
import type { ImportedGames } from '../store'

type Choice = Color | 'ignore'

const IGNORED_LABELS: Record<keyof IgnoredGames, (count: number) => string> = {
  unreadable: (count) => m.import_ignored_unreadable({ count, formatted: formatNumber(count) }),
  variant: (count) => m.import_ignored_variant({ count, formatted: formatNumber(count) }),
  unfinished: (count) => m.import_ignored_unfinished({ count, formatted: formatNumber(count) }),
  duplicate: (count) => m.import_ignored_duplicate({ count, formatted: formatNumber(count) }),
}

/** "1. e4 e5 2. Nf3 Nc6 3. Bb5…": enough to recognize a game. */
function firstMoves(game: PgnGame): string {
  const moves = game.sanMoves.slice(0, 6)
  const text = moves
    .map((san, index) => (index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san))
    .join(' ')
  return game.sanMoves.length > moves.length ? `${text}…` : text
}

/**
 * After a PGN is read: what it holds (games read, left out, what they do not say), which names
 * are the player's (several allowed, none checked at first), and for each game without
 * any of them, the player's side or leaving it out (the default).
 */
export function ImportDialog({
  batch,
  onCancel,
  onImport,
}: {
  batch: PgnBatch
  onCancel: () => void
  onImport: (games: ImportedGames) => void
}) {
  const names = useMemo(() => playerNames(batch.games), [batch])
  // Nothing checked at first: the most frequent name is not always the player's.
  const [chosen, setChosen] = useState<string[]>([])
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const missing = useMemo(() => missingInfo(batch.games), [batch])

  const chosenSide = (game: PgnGame): Color | undefined => {
    const choice = choices[game.id]
    return choice === 'white' || choice === 'black' ? choice : undefined
  }
  const sides = batch.games.map((game) => {
    const matched = sideOf(game, chosen)
    return { game, matched: matched !== undefined, side: matched ?? chosenSide(game) }
  })
  const unmatched = sides.filter((item) => !item.matched).map((item) => item.game)
  // The names to choose from: those checked, and those of the games still without one (a game
  // already the player's has its opponent's name, which is not theirs). Counted in those games.
  const remaining = new Map(
    playerNames(unmatched).map((item) => [item.name.toLowerCase(), item.games]),
  )
  const listed = names.flatMap((item) => {
    if (chosen.includes(item.name)) return [item]
    const games = remaining.get(item.name.toLowerCase())
    return games === undefined ? [] : [{ name: item.name, games }]
  })
  const kept = sides.filter((item) => item.side !== undefined)
  const ignored = Object.entries(batch.ignored).filter(([, count]) => count > 0) as [
    keyof IgnoredGames,
    number,
  ][]

  const toggleName = (name: string, on: boolean) =>
    setChosen((current) => (on ? [...current, name] : current.filter((item) => item !== name)))

  const submit = () =>
    onImport({
      games: kept.map(({ game, side }) => toReviewGame(game, side!)),
      names: chosen,
    })

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.import_title()}</DialogTitle>
          <DialogDescription>
            {m.import_read({ games: formatGameCount(batch.games.length) })}
            {ignored.length > 0 &&
              ` · ${m.import_ignored({ details: ignored.map(([reason, count]) => IGNORED_LABELS[reason](count)).join(', ') })}`}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 space-y-5 overflow-y-auto px-4">
          {(missing.date > 0 || missing.timeControl > 0 || missing.ratings > 0) && (
            <section className="space-y-1.5 rounded-md bg-muted/50 p-3">
              <h3 className="label-etabli text-muted-foreground">{m.import_missing_title()}</h3>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                {missing.date > 0 && (
                  <li>{m.import_missing_date({ games: formatGameCount(missing.date) })}</li>
                )}
                {missing.timeControl > 0 && (
                  <li>
                    {m.import_missing_time_control({ games: formatGameCount(missing.timeControl) })}
                  </li>
                )}
                {missing.ratings > 0 && (
                  <li>{m.import_missing_ratings({ games: formatGameCount(missing.ratings) })}</li>
                )}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-text-strong">{m.import_who()}</h3>
            <p className="text-xs text-muted-foreground">{m.import_who_hint()}</p>
            <ul className="max-h-36 [scrollbar-width:thin] [scrollbar-color:var(--cyc-raised)_transparent] space-y-0.5 overflow-y-auto overscroll-contain rounded-md border border-border p-1">
              {listed.map(({ name, games }) => (
                <NameOption
                  key={name}
                  name={name}
                  games={games}
                  checked={chosen.includes(name)}
                  onChange={(on) => toggleName(name, on)}
                />
              ))}
            </ul>
          </section>

          {chosen.length > 0 && unmatched.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-text-strong">
                {m.import_unmatched({ games: formatGameCount(unmatched.length) })}
              </h3>
              <p className="text-xs text-muted-foreground">{m.import_unmatched_hint()}</p>
              <ul className="max-h-64 [scrollbar-width:thin] [scrollbar-color:var(--cyc-raised)_transparent] divide-y divide-border overflow-y-auto overscroll-contain rounded-md border border-border">
                {unmatched.map((game) => (
                  <li key={game.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2.5">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm text-text-strong">
                        {game.white} – {game.black}{' '}
                        <span className="num text-muted-foreground">{game.result}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[game.playedAt && formatDate(game.playedAt), game.event]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="num truncate text-xs text-muted-foreground">
                        {firstMoves(game)}
                      </p>
                    </div>
                    <ToggleGroup
                      type="single"
                      value={choices[game.id] ?? 'ignore'}
                      onValueChange={(value) =>
                        value &&
                        setChoices((current) => ({ ...current, [game.id]: value as Choice }))
                      }
                      className="gap-1"
                    >
                      <ToggleGroupItem value="white" size="sm" className={CHIP_CLASS}>
                        {m.import_side_white()}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="black" size="sm" className={CHIP_CLASS}>
                        {m.import_side_black()}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="ignore" size="sm" className={CHIP_CLASS}>
                        {m.import_side_ignore()}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {m.confirm_cancel()}
          </Button>
          <Button disabled={kept.length === 0} onClick={submit}>
            {m.import_submit({ games: formatGameCount(kept.length) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NameOption({
  name,
  games,
  checked,
  onChange,
}: {
  name: string
  games: number
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <li className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="border-border-strong"
      />
      <Label htmlFor={id} className="flex flex-1 items-center justify-between gap-3 font-normal">
        <span className="truncate text-text-strong">{name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{formatGameCount(games)}</span>
      </Label>
    </li>
  )
}
