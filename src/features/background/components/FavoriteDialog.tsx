import { Star, StarOff } from 'lucide-react'
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
import { accountKey, deleteStoredAccounts } from '@/features/games/store'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import type { ReviewAccount } from '@/features/review/fetch'
import type { ApiSource } from '@/lib/http'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { announceFavorite, announceUnfavorite } from '../announce'
import {
  defaultDepth,
  getFavorites,
  setFavorites,
  useFavorites,
  withFavorite,
  withoutFavorite,
} from '../favorites'

/**
 * The accounts concerned: a dot, the platform and the username each. With `selected`, a checkbox
 * each, to keep one of a player's accounts while removing the other.
 */
function AccountRows({
  accounts,
  selected,
  onToggle,
}: {
  accounts: ReviewAccount[]
  selected?: (account: ReviewAccount) => boolean
  onToggle?: (account: ReviewAccount, checked: boolean) => void
}) {
  const id = useId()
  return (
    <ul className="space-y-0.5 text-sm">
      {accounts.map((account) => {
        const { source, username } = account
        const row = (
          <>
            <SourceDot source={source} />
            <span className="w-20 text-muted-foreground">{SOURCE_LABELS[source]}</span>
            <span className="font-medium text-text-strong">{username}</span>
          </>
        )
        return (
          <li key={source} className="rounded-sm even:bg-muted/40">
            {selected ? (
              <Label
                htmlFor={`${id}-${source}`}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 font-normal"
              >
                <Checkbox
                  id={`${id}-${source}`}
                  checked={selected(account)}
                  onCheckedChange={(value) => onToggle?.(account, value === true)}
                  className="border-border-strong"
                />
                {row}
              </Label>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1.5">{row}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Confirms adding a player to the favorites, or removing them (with the option to delete their
 * saved games): the same dialog from a profile's star and from the settings' cross.
 */
export function FavoriteDialog({
  mode,
  accounts,
  open,
  onOpenChange,
}: {
  mode: 'add' | 'remove'
  accounts: ReviewAccount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const favorites = useFavorites()
  const [deleteGames, setDeleteGames] = useState(false)
  // The platforms kept when removing a player with both: all removed by default.
  const [kept, setKept] = useState<ReadonlySet<ApiSource>>(new Set())
  const deleteId = useId()
  const removing = mode === 'remove'
  const choosing = removing && accounts.length > 1
  const removed = accounts.filter(({ source }) => !kept.has(source))

  const close = () => {
    setDeleteGames(false)
    setKept(new Set())
    onOpenChange(false)
  }

  const toggle = ({ source }: ReviewAccount, checked: boolean) => {
    const next = new Set(kept)
    if (checked) next.delete(source)
    else next.add(source)
    setKept(next)
  }

  const confirm = async () => {
    const deleting = deleteGames
    close()
    const current = getFavorites()
    if (!removing) {
      setFavorites(withFavorite(current, accounts))
      announceFavorite(accounts)
      return
    }
    if (current) setFavorites(withoutFavorite(current, removed))
    announceUnfavorite(removed)
    if (deleting) {
      await deleteStoredAccounts(
        removed.map(({ source, username }) => accountKey(source, username)),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-xl lg:w-auto lg:max-w-[calc(100%-2rem)] lg:min-w-xl">
        <DialogHeader>
          <DialogTitle icon={removing ? StarOff : Star}>
            {removing ? m.favorite_remove_title() : m.favorite_add_title()}
          </DialogTitle>
          <DialogDescription className="lg:whitespace-nowrap">
            {removing
              ? m.favorite_remove_body()
              : m.favorite_add_body({ count: formatNumber(favorites?.depth ?? defaultDepth()) })}
          </DialogDescription>
        </DialogHeader>
        {choosing ? (
          <AccountRows
            accounts={accounts}
            selected={({ source }) => !kept.has(source)}
            onToggle={toggle}
          />
        ) : (
          <AccountRows accounts={accounts} />
        )}
        {removing && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={deleteId}
              checked={deleteGames}
              onCheckedChange={(value) => setDeleteGames(value === true)}
              className="border-border-strong"
            />
            <Label htmlFor={deleteId} className="font-normal">
              {m.favorite_remove_delete()}
            </Label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {m.confirm_cancel()}
          </Button>
          <Button
            variant={removing ? 'destructive' : 'default'}
            disabled={removing && removed.length === 0}
            onClick={() => void confirm()}
          >
            {removing ? <StarOff data-icon="inline-start" /> : <Star data-icon="inline-start" />}
            {removing ? m.favorite_remove_action() : m.favorite_add_action()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
