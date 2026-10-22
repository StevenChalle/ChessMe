import { createFileRoute, redirect } from '@tanstack/react-router'
import { validatePlayerSearch } from '@/features/player/search'

/**
 * The analysis used to be a page of its own: its addresses (/analysis, /analysis/run…) lead to the
 * profile's tabs. A review asked by the link (start, game) still starts.
 */
export const Route = createFileRoute('/analysis')({
  beforeLoad: ({ search }) => {
    const raw = search as Record<string, unknown>
    const quick = raw.start === 'last' || raw.game !== undefined
    throw redirect({
      to: quick ? '/player/results' : '/player/analysis',
      search: quick ? raw : validatePlayerSearch(raw),
      replace: true,
    })
  },
})
