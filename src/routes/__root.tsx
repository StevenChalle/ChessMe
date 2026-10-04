import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
  useSearch,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Search } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountSearchForm } from '@/features/player/components/AccountSearchForm'
import { validatePlayerSearch } from '@/features/player/search'
import { m } from '@/paraglide/messages'

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <p className="p-8 text-muted-foreground">{m.not_found()}</p>,
})

function RootLayout() {
  const isHome = useLocation({ select: (location) => location.pathname === '/' })

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="text-2xl font-medium tracking-tight text-font-clear">
          ChessMe
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {!isHome && <HeaderSearch />}
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </>
      )}
    </div>
  )
}

/** Compact two-field search on wide screens, prefilled with the accounts currently shown. */
function HeaderSearch() {
  const current = validatePlayerSearch(useSearch({ strict: false }))
  return (
    <>
      <AccountSearchForm
        // Reset the fields whenever the linked accounts in the URL change.
        key={`${current.lichess ?? ''}|${current.chesscom ?? ''}`}
        initial={current}
        variant="compact"
        className="hidden md:flex"
      />
      <Link
        to="/"
        aria-label={m.new_search()}
        className="text-muted-foreground hover:text-font-clear md:hidden"
      >
        <Search className="size-5" />
      </Link>
    </>
  )
}
