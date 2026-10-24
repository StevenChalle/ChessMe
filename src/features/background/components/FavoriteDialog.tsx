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

/** The accounts concerned: a dot, the platform and the username each. */
function AccountRows({ accounts }: { accounts: ReviewAccount[] }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {accounts.map(({ source, username }) => (
        <li
          key={source}
          className="flex items-center gap-2 rounded-sm px-2 py-1.5 even:bg-muted/40"
        >
          <SourceDot source={source} />
          <span className="w-20 text-muted-foreground">{SOURCE_LABELS[source]}</span>
          <span className="font-medium text-text-strong">{username}</span>
        </li>
      ))}
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
  const deleteId = useId()
  const removing = mode === 'remove'

  const close = () => {
    setDeleteGames(false)
    onOpenChange(false)
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
    if (current) setFavorites(withoutFavorite(current, accounts))
    announceUnfavorite(accounts)
    if (deleting) {
      await deleteStoredAccounts(
        accounts.map(({ source, username }) => accountKey(source, username)),
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
        <AccountRows accounts={accounts} />
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
          <Button variant={removing ? 'destructive' : 'default'} onClick={() => void confirm()}>
            {removing ? <StarOff data-icon="inline-start" /> : <Star data-icon="inline-start" />}
            {removing ? m.favorite_remove_action() : m.favorite_add_action()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
