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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { accountKey, deleteStoredAccounts } from '@/features/games/store'
import { SourceDot } from '@/features/player/components/SourceBadge'
import { SOURCE_LABELS } from '@/features/player/summary'
import type { ReviewAccount } from '@/features/review/fetch'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { announceFavorite, announceUnfavorite } from '../announce'
import {
  getFavorites,
  isFavorite,
  useFavorites,
  withFavorite,
  withoutFavorite,
  defaultDepth,
  setFavorites,
} from '../favorites'

/** The accounts of the profile: a dot and the username each. */
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
 * After the player's name: a star that adds the accounts shown to the favorites, or removes them
 * when they already are (filled in gold). Always confirmed; removing can delete their saved games
 * (docs/background-analysis.md).
 */
export function FavoriteButton({ accounts }: { accounts: ReviewAccount[] }) {
  const favorites = useFavorites()
  const [open, setOpen] = useState(false)
  const [deleteGames, setDeleteGames] = useState(false)
  const deleteId = useId()
  if (accounts.length === 0) return null
  const favorite = isFavorite(favorites, accounts)
  const label = favorite ? m.favorite_remove() : m.favorite_add()

  const confirm = async () => {
    setOpen(false)
    const current = getFavorites()
    if (!favorite) {
      setFavorites(withFavorite(current, accounts))
      announceFavorite(accounts)
      return
    }
    if (current) setFavorites(withoutFavorite(current, accounts))
    announceUnfavorite(accounts)
    if (deleteGames) {
      await deleteStoredAccounts(
        accounts.map(({ source, username }) => accountKey(source, username)),
      )
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              aria-pressed={favorite}
              onClick={() => {
                setDeleteGames(false)
                setOpen(true)
              }}
              className={cn(
                'size-14 rounded-lg hover:text-primary',
                favorite ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Star className={cn('size-10', favorite && 'fill-current')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl lg:w-auto lg:max-w-[calc(100%-2rem)] lg:min-w-xl">
          <DialogHeader>
            <DialogTitle icon={favorite ? StarOff : Star}>
              {favorite ? m.favorite_remove_title() : m.favorite_add_title()}
            </DialogTitle>
            <DialogDescription className="lg:whitespace-nowrap">
              {favorite
                ? m.favorite_remove_body()
                : m.favorite_add_body({
                    count: formatNumber(favorites?.depth ?? defaultDepth()),
                  })}
            </DialogDescription>
          </DialogHeader>
          <AccountRows accounts={accounts} />
          {favorite && (
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              {m.confirm_cancel()}
            </Button>
            <Button variant={favorite ? 'destructive' : 'default'} onClick={() => void confirm()}>
              {favorite ? <StarOff data-icon="inline-start" /> : <Star data-icon="inline-start" />}
              {favorite ? m.favorite_remove_action() : m.favorite_add_action()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
