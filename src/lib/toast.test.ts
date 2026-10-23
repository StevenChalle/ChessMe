import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissToast,
  getToasts,
  showToast,
  subscribeToasts,
  TOAST_EXIT_MS,
  TOAST_MS,
} from './toast'

describe('toasts', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('show a message for a few seconds, or until closed, then fade out', () => {
    const listener = vi.fn<() => void>()
    const unsubscribe = subscribeToasts(listener)
    showToast('first')
    showToast('second', ['a line'])
    expect(getToasts().map((toast) => toast.title)).toEqual(['first', 'second'])
    dismissToast(getToasts()[1]!.id)
    // Fading out first, then gone.
    expect(getToasts()[1]).toMatchObject({ title: 'second', leaving: true })
    vi.advanceTimersByTime(TOAST_EXIT_MS)
    expect(getToasts().map((toast) => toast.title)).toEqual(['first'])
    vi.advanceTimersByTime(TOAST_MS)
    expect(getToasts()).toEqual([])
    // Shown twice, faded and removed twice; closing twice does nothing more.
    expect(listener).toHaveBeenCalledTimes(6)
    unsubscribe()
  })
})
