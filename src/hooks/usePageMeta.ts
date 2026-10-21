import { useEffect } from 'react'
import { SITE_URL } from '@/lib/project'

const SITE_NAME = 'CraftYourChess'

/** The title in index.html: the home page's, and the fallback. */
const DEFAULT_TITLE = document.title

/**
 * Per-page title, canonical link and robots tag, for search engines and browser tabs: the app is
 * rendered in the browser, index.html only carries the home page's. `noindex` keeps a page out of
 * search results (player and analysis pages: endless, one per username).
 */
export function usePageMeta({ title, noindex = false }: { title?: string; noindex?: boolean }) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = SITE_URL + window.location.pathname

    let robots: HTMLMetaElement | undefined
    if (noindex) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      robots.content = 'noindex'
      document.head.append(robots)
    }
    return () => {
      document.title = DEFAULT_TITLE
      robots?.remove()
    }
  }, [title, noindex])
}
