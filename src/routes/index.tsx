import { createFileRoute } from '@tanstack/react-router'
import { Board } from '@/components/board/Board'
import { AccountSearchForm } from '@/features/player/components/AccountSearchForm'
import { RecentSearches } from '@/features/player/components/RecentSearches'
import { ImportBox } from '@/features/import/components/ImportBox'
import { usePageMeta } from '@/hooks/usePageMeta'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const BOARD_CONFIG = { viewOnly: true, coordinates: false } as const

/** A mouse and a hover: a computer. On a phone, focusing the field would pop up the keyboard. */
const hasFinePointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

/** The path from a username to a training, shown before the first step (the form below). */
const STEPS = [
  { title: m.home_step_find, body: m.home_step_find_body },
  { title: m.home_step_analyze, body: m.home_step_analyze_body },
  { title: m.home_step_train, body: m.home_step_train_body },
]

function HomePage() {
  usePageMeta({})
  return (
    <div className="space-y-10 md:space-y-12">
      {/* The app's promise: large and light, apart from the rest of the page */}
      <div className="space-y-3">
        <h1 className="text-[2rem] leading-tight font-normal tracking-tight md:text-[2.7rem]">
          {m.home_title()}
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-foreground md:text-xl">
          {m.home_intro()}
        </p>
      </div>
      <div className="grid items-center gap-10 md:grid-cols-[1fr_minmax(0,420px)] xl:grid-cols-[1fr_450px] xl:gap-8">
        <section className="space-y-8">
          <ol aria-label={m.home_steps_label()} className="py-2">
            {STEPS.map((step, index) => (
              <li key={index} className="relative flex gap-4 pb-7 last:pb-0">
                {/* The line down to the next step */}
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-11 bottom-2 left-[19px] w-0.5 rounded-full bg-border-strong/50"
                  />
                )}
                <span className="num flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-field text-base text-text-strong">
                  {index + 1}
                </span>
                <div className="space-y-1 pt-1.5">
                  <p className="text-base font-medium text-text-strong">{step.title()}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body()}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* Two ways in: an account, or imported games (never both) */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-5">
            <section className="min-w-0 space-y-2" aria-label={m.search_section()}>
              <h2 className="label-etabli text-muted-foreground">{m.search_section()}</h2>
              <div className="space-y-6">
                <AccountSearchForm autoFocus={hasFinePointer()} />
                <RecentSearches />
              </div>
            </section>
            <p className="flex items-center gap-3 text-xs text-muted-foreground uppercase md:hidden">
              <span className="h-px flex-1 bg-border" />
              {m.home_or()}
              <span className="h-px flex-1 bg-border" />
            </p>
            <section className="min-w-0 space-y-2" aria-label={m.import_section()}>
              <h2 className="label-etabli text-muted-foreground">{m.import_section()}</h2>
              <ImportBox />
            </section>
          </div>
        </section>
        <Board config={BOARD_CONFIG} className="rounded-md shadow-xl" />
      </div>
    </div>
  )
}
