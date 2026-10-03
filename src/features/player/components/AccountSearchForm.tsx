import { useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Search } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { ApiSource } from '@/lib/http'
import { cn } from '@/lib/utils'
import { cleanUsername, copySource, otherSource, type PlayerUsernames } from '../search'
import { SOURCE_LABELS } from '../summary'
import { SourceDot } from './SourceBadge'

const INPUT_CLASS =
  'h-9 w-full rounded-md border bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

/**
 * One username per platform, either or both. Accounts may have different names:
 * a "same username" shortcut copies one field into the other, in either direction.
 */
export function AccountSearchForm({
  initial = {},
  variant = 'full',
  autoFocus,
  className,
}: {
  initial?: PlayerUsernames
  variant?: 'full' | 'compact'
  autoFocus?: boolean
  className?: string
}) {
  const [values, setValues] = useState<Record<ApiSource, string>>({
    lichess: initial.lichess ?? '',
    chesscom: initial.chesscom ?? '',
  })
  const [lastEdited, setLastEdited] = useState<ApiSource | null>(null)
  const navigate = useNavigate()
  const lichess = cleanUsername(values.lichess)
  const chesscom = cleanUsername(values.chesscom)
  const canSubmit = Boolean(lichess || chesscom)
  const compact = variant === 'compact'

  const setValue = (source: ApiSource, value: string) => {
    setValues((current) => ({ ...current, [source]: value }))
    setLastEdited(source)
  }

  /** Fills `target` with the other field's username. */
  const copyInto = (target: ApiSource) => {
    setValues((current) => ({ ...current, [target]: current[otherSource(target)].trim() }))
  }

  /** In the full form, each field gets its own button copying from the other one. */
  const canCopyInto = (target: ApiSource) => {
    const from = cleanUsername(values[otherSource(target)])
    return Boolean(from) && from !== cleanUsername(values[target])
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    void navigate({ to: '/player', search: { lichess, chesscom } })
  }

  const copyButton = (target: ApiSource) => (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={!canCopyInto(target)}
      onClick={() => copyInto(target)}
      title={`Même pseudo que sur ${SOURCE_LABELS[otherSource(target)]}`}
      aria-label={`Utiliser le pseudo ${SOURCE_LABELS[otherSource(target)]} pour ${SOURCE_LABELS[target]}`}
      className="text-muted-foreground"
    >
      {/* Lichess sits above Chess.com: the arrow points from the source field to this one */}
      {target === 'chesscom' ? <ArrowDown /> : <ArrowUp />}
      Même pseudo
    </Button>
  )

  if (compact) {
    // A single button between the fields copies from the last edited one.
    const from = copySource(values, lastEdited)
    const to = from && otherSource(from)
    return (
      <form
        onSubmit={handleSubmit}
        role="search"
        className={cn('flex items-center gap-1', className)}
      >
        <UsernameInput source="lichess" value={values.lichess} onChange={setValue} compact />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!from}
          onClick={() => to && copyInto(to)}
          title={
            from && to
              ? `Même pseudo sur ${SOURCE_LABELS[to]} que sur ${SOURCE_LABELS[from]}`
              : 'Même pseudo sur les deux sites'
          }
          aria-label={
            from && to
              ? `Utiliser le pseudo ${SOURCE_LABELS[from]} pour ${SOURCE_LABELS[to]}`
              : 'Utiliser le même pseudo sur les deux sites'
          }
          className="text-muted-foreground"
        >
          {from === 'chesscom' ? <ArrowLeft /> : <ArrowRight />}
        </Button>
        <UsernameInput source="chesscom" value={values.chesscom} onChange={setValue} compact />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={!canSubmit}
          aria-label="Rechercher"
        >
          <Search />
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn('space-y-3', className)}>
      <UsernameInput
        source="lichess"
        value={values.lichess}
        onChange={setValue}
        autoFocus={autoFocus}
        labelAside={copyButton('lichess')}
      />
      <UsernameInput
        source="chesscom"
        value={values.chesscom}
        onChange={setValue}
        labelAside={copyButton('chesscom')}
      />
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="lg" disabled={!canSubmit}>
          <Search />
          Rechercher
        </Button>
        <span className="text-xs text-muted-foreground">Un seul compte suffit.</span>
      </div>
    </form>
  )
}

function UsernameInput({
  source,
  value,
  onChange,
  autoFocus,
  labelAside,
  compact,
}: {
  source: ApiSource
  value: string
  onChange: (source: ApiSource, value: string) => void
  autoFocus?: boolean
  labelAside?: ReactNode
  compact?: boolean
}) {
  const id = useId()
  const label = SOURCE_LABELS[source]

  const input = (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(source, event.target.value)}
      placeholder={compact ? label : `Pseudo ${label}`}
      aria-label={compact ? `Pseudo ${label}` : undefined}
      autoFocus={autoFocus}
      spellCheck={false}
      autoComplete="off"
      autoCapitalize="off"
      className={cn(INPUT_CLASS, compact && 'pl-6')}
    />
  )

  if (compact) {
    return (
      <div className="relative w-36">
        <SourceDot source={source} className="absolute top-1/2 left-2.5 -translate-y-1/2" />
        {input}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex h-6 items-center justify-between">
        <label htmlFor={id} className="inline-flex items-center gap-1.5 text-sm">
          <SourceDot source={source} />
          {label}
        </label>
        {labelAside}
      </div>
      {input}
    </div>
  )
}
