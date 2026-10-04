import { RefreshCw } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { applyAppUpdate, isAppUpdateAvailable, subscribeAppUpdate } from '@/lib/appUpdate'
import { m } from '@/paraglide/messages'

/** Offers the new version of the app once it is ready (found after launch). */
export function UpdateBanner() {
  const available = useSyncExternalStore(subscribeAppUpdate, isAppUpdateAvailable, () => false)
  if (!available) return null
  return (
    <div className="bg-primary/15 text-sm text-font-clear">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <span>{m.update_available()}</span>
        <Button size="sm" onClick={applyAppUpdate}>
          <RefreshCw data-icon="inline-start" />
          {m.update_apply()}
        </Button>
      </div>
    </div>
  )
}
