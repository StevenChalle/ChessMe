import { createFileRoute } from '@tanstack/react-router'
import { Board } from '@/components/board/Board'
import { AccountSearchForm } from '@/features/player/components/AccountSearchForm'
import { RecentSearches } from '@/features/player/components/RecentSearches'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const BOARD_CONFIG = { viewOnly: true, coordinates: false } as const

function HomePage() {
  return (
    <div className="grid items-center gap-10 md:grid-cols-[1fr_minmax(0,420px)]">
      <section className="space-y-4">
        <h1 className="text-3xl font-medium text-font-clear">{m.home_title()}</h1>
        <p className="max-w-prose text-muted-foreground">{m.home_intro()}</p>
        <AccountSearchForm autoFocus className="max-w-sm" />
        <RecentSearches className="max-w-sm pt-4" />
      </section>
      <Board config={BOARD_CONFIG} className="rounded-md shadow-xl" />
    </div>
  )
}
