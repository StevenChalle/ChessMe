import { afterEach, describe, expect, it } from 'vitest'
import { ActiveTime, trackActiveTime } from './activeTime'

function clock() {
  const state = { now: 0 }
  return { state, time: new ActiveTime(() => state.now) }
}

describe('ActiveTime', () => {
  it('leaves out a pause: hidden without progress (phone screen off)', () => {
    const { state, time } = clock()
    state.now = 3000 // 3 s shown
    time.setShown(false)
    state.now = 63_000 // 60 s hidden, frozen: nothing happens
    expect(time.elapsedMs()).toBe(3000)
    time.setShown(true)
    state.now = 65_000 // 2 s shown again
    expect(time.elapsedMs()).toBe(5000)
  })

  it('counts hidden time when the job went on (desktop tab in the background)', () => {
    const { state, time } = clock()
    state.now = 3000
    time.setShown(false)
    state.now = 10_000
    time.markProgress()
    state.now = 20_000
    time.markProgress()
    expect(time.elapsedMs()).toBe(20_000)
    state.now = 33_000
    time.setShown(true)
    expect(time.elapsedMs()).toBe(33_000)
  })

  it('does not let a single result delivered on resume turn a pause into work', () => {
    const { state, time } = clock()
    state.now = 3000
    time.setShown(false)
    state.now = 63_000
    time.markProgress()
    time.setShown(true)
    expect(time.elapsedMs()).toBe(3000)
  })

  it('freezes once stopped', () => {
    const { state, time } = clock()
    state.now = 4000
    time.stop()
    state.now = 9000
    time.setShown(false)
    expect(time.elapsedMs()).toBe(4000)
  })
})

describe('trackActiveTime', () => {
  const setVisibility = (visibility: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  afterEach(() => setVisibility('visible'))

  it('follows the page visibility, and stops for good', () => {
    const { time, stop } = trackActiveTime()
    setVisibility('hidden')
    const hidden = time.elapsedMs()
    expect(time.elapsedMs()).toBe(hidden)
    setVisibility('visible')
    stop()
    const stopped = time.elapsedMs()
    setVisibility('hidden')
    setVisibility('visible')
    expect(time.elapsedMs()).toBe(stopped)
  })
})
