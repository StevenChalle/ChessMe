import { createFileRoute } from '@tanstack/react-router'
import { Board } from '@/components/board/Board'
import { AccountSearchForm } from '@/features/player/components/AccountSearchForm'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const BOARD_CONFIG = { viewOnly: true, coordinates: false } as const

function HomePage() {
  return (
    <div className="grid items-center gap-10 md:grid-cols-[1fr_minmax(0,420px)]">
      <section className="space-y-4">
        <h1 className="text-3xl font-medium text-font-clear">
          Explore tes parties Lichess et Chess.com
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Lie ton compte Lichess, ton compte Chess.com ou les deux, même s'ils ont des pseudos
          différents, pour réunir tes statistiques au même endroit.
        </p>
        <AccountSearchForm autoFocus className="max-w-sm" />
      </section>
      <Board config={BOARD_CONFIG} className="rounded-md shadow-xl" />
    </div>
  )
}
