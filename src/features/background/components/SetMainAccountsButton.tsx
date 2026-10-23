import { UserPlus } from 'lucide-react'
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
import { m } from '@/paraglide/messages'
import {
  areMainAccounts,
  replacedAccounts,
  setMainProfile,
  useMainProfile,
  withMainAccounts,
} from '../profile'

/**
 * After the player's name: makes the accounts shown the main ones (docs/background-analysis.md).
 * Disabled when they already are. Replacing main accounts asks first, and can delete their games.
 */
export function SetMainAccountsButton({ accounts }: { accounts: ReviewAccount[] }) {
  const profile = useMainProfile()
  const [replacing, setReplacing] = useState<ReviewAccount[] | undefined>(undefined)
  const [deleteGames, setDeleteGames] = useState(false)
  const deleteId = useId()
  if (accounts.length === 0) return null
  const already = areMainAccounts(profile, accounts)
  const label = already ? m.set_main_accounts_already() : m.set_main_accounts()

  const set = () => {
    const replaced = replacedAccounts(profile, accounts)
    if (replaced.length > 0) {
      setDeleteGames(false)
      setReplacing(replaced)
    } else {
      setMainProfile(withMainAccounts(profile, accounts))
    }
  }

  const confirm = async () => {
    const replaced = replacing ?? []
    setMainProfile(withMainAccounts(profile, accounts))
    setReplacing(undefined)
    if (deleteGames) {
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
            {/* A disabled button gets no pointer events: the tooltip hangs on its wrapper. */}
            <span className="inline-flex">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label}
                disabled={already}
                onClick={set}
                className="text-muted-foreground hover:text-text-strong"
              >
                <UserPlus />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog
        open={replacing !== undefined}
        onOpenChange={(open) => !open && setReplacing(undefined)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.set_main_confirm_title()}</DialogTitle>
            <DialogDescription>{m.set_main_confirm_body()}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {replacing?.map(({ source, username }) => (
              <li key={source} className="flex items-center gap-2">
                <SourceLabel source={source} />
                <span className="text-text-strong">{username}</span>
              </li>
            ))}
          </ul>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplacing(undefined)}>
              {m.confirm_cancel()}
            </Button>
            <Button onClick={() => void confirm()}>
              <UserPlus data-icon="inline-start" />
              {m.set_main_confirm_action()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
