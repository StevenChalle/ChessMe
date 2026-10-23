import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, getToasts, showToast, subscribeToasts, TOAST_MS } from './toast'

describe('toasts', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('show a message for a few seconds, or until closed', () => {
    const listener = vi.fn<() => void>()
    const unsubscribe = subscribeToasts(listener)
    showToast('first')
    showToast('second', ['a line'])
    expect(getToasts().map((toast) => toast.title)).toEqual(['first', 'second'])
    dismissToast(getToasts()[1]!.id)
    expect(getToasts().map((toast) => toast.title)).toEqual(['first'])
    vi.advanceTimersByTime(TOAST_MS)
    expect(getToasts()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(4)
    unsubscribe()
  })
})
