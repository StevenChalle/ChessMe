import { describe, expect, it } from 'vitest'
import { detectDevice } from './device'

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

describe('detectDevice', () => {
  it('trusts Client Hints when available', () => {
    expect(detectDevice({ userAgent: WINDOWS_CHROME, userAgentData: { mobile: true } })).toBe(
      'mobile',
    )
    expect(detectDevice({ userAgent: IPHONE, userAgentData: { mobile: false } })).toBe('desktop')
  })

  it('falls back to the user agent', () => {
    expect(detectDevice({ userAgent: WINDOWS_CHROME })).toBe('desktop')
    expect(detectDevice({ userAgent: IPHONE })).toBe('mobile')
  })

  it('recognizes iPads behind their Mac user agent', () => {
    expect(detectDevice({ userAgent: MAC_SAFARI, maxTouchPoints: 5 })).toBe('mobile')
    expect(detectDevice({ userAgent: MAC_SAFARI, maxTouchPoints: 0 })).toBe('desktop')
  })
})
