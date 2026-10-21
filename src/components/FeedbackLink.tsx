import { Link } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { m } from '@/paraglide/messages'

/** Header: "Feedback?", next to the settings (its text hidden on small screens, the icon stays). */
export function FeedbackButton() {
  return (
    <Link
      to="/contact"
      title={m.feedback_button()}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-text-strong data-[status=active]:text-text-strong"
    >
      <MessageSquare aria-hidden className="size-4" />
      <span className="max-sm:sr-only">{m.feedback_button()}</span>
    </Link>
  )
}

/** A discreet line where people are likely to have something to say (end of a training…). */
export function FeedbackNudge({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {text}{' '}
      <Link
        to="/contact"
        className="text-foreground underline underline-offset-4 hover:text-text-strong"
      >
        {m.feedback_nudge_link()}
      </Link>
    </p>
  )
}
