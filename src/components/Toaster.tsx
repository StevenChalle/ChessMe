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
          className="pointer-events-auto flex max-w-md min-w-72 animate-in items-start gap-3 rounded-lg bg-primary px-5 py-4 text-primary-foreground shadow-pop fade-in-0 slide-in-from-bottom-2"
        >
          <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-lg font-semibold">{toast.title}</p>
            {toast.lines.map((line) => (
              <p key={line} className="text-base">
                {line}
              </p>
            ))}
          </div>
          <button
            type="button"
            aria-label={m.toast_close()}
            onClick={() => dismissToast(toast.id)}
            className="mt-1 opacity-70 hover:opacity-100"
          >
            <X className="size-5" />
          </button>
        </div>
      ))}
    </div>
  )
}
