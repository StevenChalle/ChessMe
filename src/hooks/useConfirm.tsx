import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'

/**
 * `confirm(options)` opens the dialog and resolves to the answer; render `dialog` once.
 * Lets callers write `if (await confirm(...))` instead of juggling open state.
 */
export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [options, setOptions] = useState<ConfirmOptions | undefined>()
  const resolver = useRef<((answer: boolean) => void) | undefined>(undefined)

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const answer = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = undefined
    setOptions(undefined)
  }

  const dialog = options ? (
    <ConfirmDialog
      open
      options={options}
      onConfirm={() => answer(true)}
      onCancel={() => answer(false)}
    />
  ) : null

  return { confirm, dialog }
}
