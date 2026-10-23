import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CheckListItem, CHECK_LIST_CLASS } from '@/components/CheckListItem'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getMainProfile, mainAccounts } from '@/features/background/profile'
import { SourceLabel } from '@/features/player/components/SourceBadge'
import { formatGameCount } from '@/lib/format'
import type { ApiSource } from '@/lib/http'
import { m } from '@/paraglide/messages'
import { accountKey, clearGameStore, storedAccounts } from '../store'

type Account = { account: string; games: number }

/** 'lichess:alice' as its platform and username. */
function AccountLabel({ account }: { account: string }) {
  const [source, username] = account.split(/:(.*)/) as [ApiSource, string]
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <SourceLabel source={source} compact />
      <span className="truncate">{username}</span>
    </span>
  )
}

/**
 * Clearing the saved games, but for the players checked: the accounts stored, most games first
 * (as the import's list of players). The main accounts are checked to begin with.
 */
export function ClearGamesDialog({
  open,
  onOpenChange,
  onCleared,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCleared?: () => void
}) {
  const [accounts, setAccounts] = useState<Account[] | undefined>(undefined)
  const [kept, setKept] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    let current = true
    void storedAccounts().then((stored) => {
      if (!current) return
      const profile = getMainProfile()
      const main = profile
        ? mainAccounts(profile).map(({ source, username }) => accountKey(source, username))
        : []
      setAccounts(stored)
      setKept(stored.filter(({ account }) => main.includes(account)).map(({ account }) => account))
    })
    return () => {
      current = false
    }
  }, [open])

  const toggle = (account: string, on: boolean) =>
    setKept((list) => (on ? [...list, account] : list.filter((item) => item !== account)))

  const clear = async () => {
    await clearGameStore(kept)
    onOpenChange(false)
    onCleared?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle icon={Trash2}>{m.settings_cache_games_confirm_title()}</DialogTitle>
          <DialogDescription>{m.settings_cache_games_confirm_body()}</DialogDescription>
        </DialogHeader>
        {accounts && accounts.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-text-strong">
              {m.settings_cache_games_keep()}
            </h3>
            <ul className={CHECK_LIST_CLASS}>
              {accounts.map(({ account, games }) => (
                <CheckListItem
                  key={account}
                  label={<AccountLabel account={account} />}
                  count={formatGameCount(games)}
                  checked={kept.includes(account)}
                  onChange={(on) => toggle(account, on)}
                />
              ))}
            </ul>
          </section>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m.confirm_cancel()}
          </Button>
          <Button variant="destructive" onClick={() => void clear()}>
            <Trash2 data-icon="inline-start" />
            {m.settings_cache_confirm_action()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
