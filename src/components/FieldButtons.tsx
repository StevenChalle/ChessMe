import { ClipboardPaste, X } from 'lucide-react'
import type { PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const canPaste = () => typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)

// Keeps the field focused, so the buttons do not vanish before the click.
const keepFocus = (event: PointerEvent) => event.preventDefault()

/**
 * Small buttons inside a field, shown while it has focus (its wrapper has `group`): clear it (when
 * it has text) and paste the clipboard's text (where the browser can read it; a refusal does
 * nothing). Pressing them keeps the focus in the field.
 */
export function FieldButtons({
  hasValue,
  onClear,
  onPaste,
  className,
}: {
  hasValue: boolean
  onClear: () => void
  onPaste: (text: string) => void
  className?: string
}) {
  const paste = canPaste()
  if (!hasValue && !paste) return null
  return (
    <span
      className={cn(
        'pointer-events-none absolute flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        className,
      )}
    >
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={m.field_clear()}
          aria-label={m.field_clear()}
          onPointerDown={keepFocus}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="text-muted-foreground hover:text-text-strong"
        >
          <X />
        </Button>
      )}
      {paste && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={m.paste_clipboard()}
          aria-label={m.paste_clipboard()}
          onPointerDown={keepFocus}
          onMouseDown={(event) => event.preventDefault()}
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText()
              if (text) onPaste(text)
            } catch {
              // Refused by the browser or the user: nothing to paste
            }
          }}
          className="text-muted-foreground hover:text-text-strong"
        >
          <ClipboardPaste />
        </Button>
      )}
    </span>
  )
}
