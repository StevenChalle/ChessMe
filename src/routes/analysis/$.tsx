import { createFileRoute } from '@tanstack/react-router'

/** Any old /analysis/… address: redirected by the parent route. */
export const Route = createFileRoute('/analysis/$')({})
