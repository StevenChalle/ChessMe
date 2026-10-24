import { Star } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ReviewAccount } from '@/features/review/fetch'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { isFavorite, useFavorites } from '../favorites'
import { FavoriteDialog } from './FavoriteDialog'

/**
 * After the player's name: a star that adds the accounts shown to the favorites, or removes them
 * when they already are (filled in gold). Always confirmed (FavoriteDialog,
 * docs/background-analysis.md).
 */
export function FavoriteButton({ accounts }: { accounts: ReviewAccount[] }) {
  const favorites = useFavorites()
  const [open, setOpen] = useState(false)
  if (accounts.length === 0) return null
  const favorite = isFavorite(favorites, accounts)
  const label = favorite ? m.favorite_remove() : m.favorite_add()

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
              onClick={() => setOpen(true)}
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
      <FavoriteDialog
        mode={favorite ? 'remove' : 'add'}
        accounts={accounts}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
