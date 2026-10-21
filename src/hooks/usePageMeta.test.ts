import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePageMeta } from './usePageMeta'

const robots = () => document.head.querySelector('meta[name="robots"]')

describe('usePageMeta', () => {
  it('sets the page title, then restores the default', () => {
    const initial = document.title
    const { unmount } = renderHook(() => usePageMeta({ title: 'Contact' }))
    expect(document.title).toBe('Contact · CraftYourChess')
    unmount()
    expect(document.title).toBe(initial)
  })

  it('adds a noindex tag while mounted only', () => {
    const { unmount } = renderHook(() => usePageMeta({ title: 'Player', noindex: true }))
    expect(robots()?.getAttribute('content')).toBe('noindex')
    unmount()
    expect(robots()).toBeNull()
  })

  it('points the canonical link at the current path', () => {
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = 'https://craftyourchess.com/'
    document.head.append(link)
    window.history.pushState({}, '', '/legal')
    renderHook(() => usePageMeta({ title: 'Legal' }))
    expect(link.href).toBe('https://craftyourchess.com/legal')
    link.remove()
    window.history.pushState({}, '', '/')
  })
})
