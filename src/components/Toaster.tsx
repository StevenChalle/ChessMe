import { CircleCheck, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

/** The notifications (lib/toast.ts), at the bottom of the screen, announced to screen readers. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  return (
    <div
      aria-live="polite"
      // Above the phone's gesture bar, where there is one.
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          // A pop: grows into place on arrival, shrinks away on leaving; still for reduced motion.
          className={cn(
            'pointer-events-auto flex max-w-lg items-start gap-2.5 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-pop motion-reduce:animate-none sm:gap-3 sm:px-5 sm:py-4',
            toast.leaving
              ? 'animate-out duration-150 ease-in fade-out-0 fill-mode-forwards zoom-out-95'
              : 'animate-in duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] fade-in-0 zoom-in-90',
          )}
        >
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 sm:size-6" />
          <div className="flex-1 space-y-0.5 sm:space-y-1">
            <p className="text-[0.95rem] font-semibold sm:text-lg">{toast.title}</p>
            {toast.items.length > 0 && (
              <p className="flex flex-col text-sm sm:flex-row sm:flex-wrap sm:gap-x-1.5 sm:text-base">
                {toast.items.map((item, index) => (
                  <span key={item} className="whitespace-nowrap">
                    {index > 0 && <span className="max-sm:hidden">- </span>}
                    {item}
                  </span>
                ))}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={m.toast_close()}
            onClick={() => dismissToast(toast.id)}
            className="mt-0.5 opacity-70 hover:opacity-100 sm:mt-1"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>
      ))}
    </div>
  )
}
