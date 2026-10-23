import { ArrowRight, UserCheck, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { accountKey, deleteStoredAccounts } from '@/features/games/store'
import { SourceLabel } from '@/features/player/components/SourceBadge'
import type { ReviewAccount } from '@/features/review/fetch'
import { formatNumber } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import {
  areMainAccounts,
  mainAccounts,
  replacedAccounts,
  setMainProfile,
  useMainProfile,
  withMainAccounts,
  type MainProfile,
} from '../profile'

const SOURCES: ApiSource[] = ['lichess', 'chesscom']

/** One platform in the dialog: the main account before, and after. */
type Change = { source: ApiSource; before?: string; after?: string }

function changes(profile: MainProfile | undefined, accounts: ReviewAccount[]): Change[] {
  const before = profile ? mainAccounts(profile) : []
  const after = mainAccounts(withMainAccounts(profile, accounts))
  return SOURCES.flatMap((source) => {
    const old = before.find((account) => account.source === source)?.username
    const next = after.find((account) => account.source === source)?.username
    return old || next ? [{ source, before: old, after: next }] : []
  })
}

const same = (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase()

/** A main account dropped: struck through, in the loss color. */
function Dropped({ username }: { username: string }) {
  return <s className="text-loss decoration-2">{username}</s>
}

function ChangeRow({ change: { source, before, after } }: { change: Change }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm px-2 py-1.5 even:bg-muted/40">
      <span className="w-24 shrink-0">
        <SourceLabel source={source} />
      </span>
      {before && after && same(before, after) ? (
        <>
          <span className="text-text-strong">{after}</span>
          <span className="text-xs text-muted-foreground">{m.set_main_unchanged()}</span>
        </>
      ) : (
        <>
          {before && <Dropped username={before} />}
          {before && after && <ArrowRight aria-hidden className="size-4 text-muted-foreground" />}
          {after && <span className="font-medium text-win">{after}</span>}
          {!before && after && (
            <span className="text-xs text-muted-foreground">{m.set_main_added()}</span>
          )}
        </>
      )}
    </li>
  )
}

/**
 * After the player's name: makes the accounts shown the main ones (docs/background-analysis.md).
 * When they already are, a check mark instead. Always confirmed: the dialog shows each platform's main account
 * before and after (dropped ones struck through), and can delete the games of those dropped.
 */
export function SetMainAccountsButton({ accounts }: { accounts: ReviewAccount[] }) {
  const profile = useMainProfile()
  const [open, setOpen] = useState(false)
  const [deleteGames, setDeleteGames] = useState(false)
  const deleteId = useId()
  if (accounts.length === 0) return null
  const already = areMainAccounts(profile, accounts)
  const label = already ? m.set_main_accounts_already() : m.set_main_accounts()
  const replaced = replacedAccounts(profile, accounts)
  const replacing = replaced.length > 0
  const next = withMainAccounts(profile, accounts)

  const confirm = async () => {
    setMainProfile(next)
    setOpen(false)
    if (replacing && deleteGames) {
      await deleteStoredAccounts(
        replaced.map(({ source, username }) => accountKey(source, username)),
      )
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {already ? (
              // Already the main accounts: a mark, not a button (a disabled one would look faded).
              <span
                role="img"
                aria-label={label}
                tabIndex={0}
                className="inline-flex size-12 items-center justify-center rounded-md text-win outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserCheck className="size-10" />
              </span>
            ) : (
              <Button
                variant="ghost"
                aria-label={label}
                onClick={() => {
                  setDeleteGames(false)
                  setOpen(true)
                }}
                className="size-12 rounded-md text-muted-foreground hover:text-primary"
              >
                <UserPlus className="size-10" />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {replacing ? m.set_main_confirm_title() : m.set_main_confirm_new_title()}
            </DialogTitle>
            <DialogDescription>
              {replacing
                ? m.set_main_confirm_body()
                : m.set_main_confirm_new_body({ count: formatNumber(next.depth) })}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-0.5 text-sm">
            {changes(profile, accounts).map((change) => (
              <ChangeRow key={change.source} change={change} />
            ))}
          </ul>
          {replacing && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={deleteId}
                checked={deleteGames}
                onCheckedChange={(value) => setDeleteGames(value === true)}
                className="border-border-strong"
              />
              <Label htmlFor={deleteId} className="font-normal">
                {m.set_main_confirm_delete()}
              </Label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {m.confirm_cancel()}
            </Button>
            <Button onClick={() => void confirm()}>
              <UserPlus data-icon="inline-start" />
              {replacing ? m.set_main_confirm_action() : m.set_main_confirm_set()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
