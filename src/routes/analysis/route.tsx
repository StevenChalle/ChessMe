import { createFileRoute, Outlet, useBlocker, useLocation } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PlayerHeader } from '@/features/player/components/PlayerHeader'
import {
  hasAnyUsername,
  validatePlayerSearch,
  type PlayerUsernames,
} from '@/features/player/search'
import type { AccountSummary } from '@/features/player/summary'
import { usePlayerAccounts } from '@/features/player/usePlayerAccounts'
import { reviewableAccounts } from '@/features/review/accounts'
import { AnalysisTabs } from '@/features/review/components/AnalysisTabs'
import { AnalysisActions } from '@/features/review/components/ReviewButtons'
import { AnalysisSessionProvider } from '@/features/review/session'
import { useAnalysisSession } from '@/features/review/sessionContext'
import { TrainingView } from '@/features/training/components/TrainingView'
import { chessComPlayerQueryOptions } from '@/lib/chesscom/queries'
import { formatOrList } from '@/lib/format'
import { lichessUserQueryOptions } from '@/lib/lichess/queries'
import { m } from '@/paraglide/messages'

type AnalysisSearch = PlayerUsernames & {
  /** "last": start the quick review of the last game right away */
  start?: 'last'
}

/** /analysis?lichess=<name>&chesscom=<name>: the analysis page of these accounts, with tabs. */
export const Route = createFileRoute('/analysis')({
  validateSearch: (search: Record<string, unknown>): AnalysisSearch => ({
    ...validatePlayerSearch(search),
    ...(search.start === 'last' ? { start: 'last' as const } : {}),
  }),
  loaderDeps: ({ search }) => ({ lichess: search.lichess, chesscom: search.chesscom }),
  // prefetchQuery never throws: each source handles its own failure in the UI.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      deps.lichess && queryClient.prefetchQuery(lichessUserQueryOptions(deps.lichess)),
      deps.chesscom && queryClient.prefetchQuery(chessComPlayerQueryOptions(deps.chesscom)),
    ]),
  component: AnalysisLayout,
  pendingComponent: () => <p className="text-muted-foreground">{m.player_loading()}</p>,
})

function AnalysisLayout() {
  const { lichess, chesscom, start } = Route.useSearch()
  const usernames = useMemo(() => ({ lichess, chesscom }), [lichess, chesscom])
  const { linked, accounts, noAccount } = usePlayerAccounts(usernames)
  const reviewable = useMemo(() => reviewableAccounts(accounts), [accounts])

  if (!hasAnyUsername(usernames)) {
    return <p className="text-muted-foreground">{m.player_need_username()}</p>
  }
  if (noAccount) {
    const names = formatOrList(linked.map((source) => m.quoted({ text: usernames[source]! })))
    return <p className="text-muted-foreground">{m.player_not_found({ names })}</p>
  }
  if (reviewable.accounts.length === 0) {
    return <p className="text-muted-foreground">{m.analysis_unavailable()}</p>
  }

  return (
    // A new session for other accounts.
    <AnalysisSessionProvider
      key={`${lichess ?? ''}|${chesscom ?? ''}`}
      accounts={reviewable.accounts}
      gameCounts={reviewable.gameCounts}
      usernames={usernames}
      start={start}
    >
      <AnalysisPage usernames={usernames} accounts={accounts} />
    </AnalysisSessionProvider>
  )
}

function AnalysisPage({
  usernames,
  accounts,
}: {
  usernames: PlayerUsernames
  accounts: AccountSummary[]
}) {
  const { analysis, training, endTraining } = useAnalysisSession()
  const onTrainingTab = useLocation({
    select: (location) => location.pathname === '/analysis/training',
  })

  // Nothing is saved yet: leaving the page during an analysis or a training asks first.
  // Switching tabs inside the page is never blocked.
  const busy = analysis.status === 'running' || training !== undefined
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => busy && !next.pathname.startsWith('/analysis'),
    enableBeforeUnload: () => busy,
    withResolver: true,
  })

  return (
    <div className="space-y-6">
      <PlayerHeader accounts={accounts} profileLink={usernames} actions={<AnalysisActions />} />
      <h2 className="text-xl font-medium text-font-clear">{m.review_title()}</h2>
      <AnalysisTabs usernames={usernames} />
      <Outlet />
      {/* Kept mounted while another tab is shown: the training session goes on where it was. */}
      {training && (
        <div hidden={!onTrainingTab}>
          <TrainingView
            key={training.id}
            mistakes={training.mistakes}
            validMaxDrop={training.validMaxDrop}
            onExit={endTraining}
          />
        </div>
      )}
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        options={{
          title: m.confirm_leave_title(),
          description: m.confirm_leave_body(),
          confirmLabel: m.confirm_leave_action(),
          cancelLabel: m.confirm_cancel(),
        }}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
