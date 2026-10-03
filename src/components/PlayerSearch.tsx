import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'

export function PlayerSearch({
  className,
  autoFocus,
}: {
  className?: string
  autoFocus?: boolean
}) {
  const [username, setUsername] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) return
    void navigate({ to: '/player/$username', params: { username: trimmed } })
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Pseudo Lichess"
        aria-label="Pseudo Lichess"
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        className="h-9 w-full rounded-md border bg-muted pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  )
}
