import { CircleCheck, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'
import { m } from '@/paraglide/messages'

/** The notifications (lib/toast.ts), at the bottom of the screen, announced to screen readers. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex max-w-md animate-in items-start gap-2.5 rounded-md border border-border bg-popover px-3.5 py-2.5 text-sm text-popover-foreground shadow-pop fade-in-0 slide-in-from-bottom-2"
        >
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-win" />
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            aria-label={m.toast_close()}
            onClick={() => dismissToast(toast.id)}
            className="mt-0.5 text-muted-foreground hover:text-text-strong"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
