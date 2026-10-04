/** The kind of device the app runs on: it sets the engine speed assumed in time estimates. */
export type DeviceKind = 'desktop' | 'mobile'

type NavigatorLike = {
  userAgent: string
  maxTouchPoints?: number
  /** User-Agent Client Hints (Chromium browsers) */
  userAgentData?: { mobile?: boolean }
}

/**
 * Client Hints when the browser has them (Chrome, Edge, Android), otherwise the user agent.
 * iPads report a Mac user agent: a Mac with a touch screen is an iPad.
 */
export function detectDevice(nav: NavigatorLike | undefined = globalThis.navigator): DeviceKind {
  if (!nav) return 'desktop'
  if (typeof nav.userAgentData?.mobile === 'boolean') {
    return nav.userAgentData.mobile ? 'mobile' : 'desktop'
  }
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return 'mobile'
  if (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1) return 'mobile'
  return 'desktop'
}
