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
import { Footer } from '@/components/Footer'
import { FeedbackButton } from '@/components/FeedbackLink'
import { SettingsMenu } from '@/components/SettingsMenu'
import { UpdateBanner } from '@/components/UpdateBanner'
import { AccountSearchForm } from '@/features/player/components/AccountSearchForm'
import { validatePlayerSearch } from '@/features/player/search'
import { usePageMeta } from '@/hooks/usePageMeta'
import { m } from '@/paraglide/messages'

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const isHome = useLocation({ select: (location) => location.pathname === '/' })

  return (
    <div className="flex min-h-dvh flex-col">
      <UpdateBanner />
      <header className="header-etabli">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
          {/* The name as a wordmark: brand, not translated */}
          <Link
            to="/"
            className="flex items-center gap-3 font-brand text-2xl font-bold tracking-tight text-brand"
          >
            <img src={`${import.meta.env.BASE_URL}pwa-64x64.png`} alt="" className="size-10" />
            <span>
              Craft<span className="font-light text-brand-accent">Your</span>Chess
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            {!isHome && <HeaderSearch />}
            <FeedbackButton />
            <SettingsMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
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
        className="text-muted-foreground hover:text-text-strong md:hidden"
      >
        <Search className="size-5" />
      </Link>
    </>
  )
}

/** Any unknown path: the host serves the app with a 200, so keep such pages out of search results. */
function NotFound() {
  usePageMeta({ noindex: true })
  return <p className="p-8 text-muted-foreground">{m.not_found()}</p>
}
