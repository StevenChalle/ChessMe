import { CircleCheck, LoaderCircle, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { CHIP_CLASS } from '@/components/chip'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ContactNotConfigured,
  FEEDBACK_KINDS,
  sendFeedback,
  technicalContext,
  type FeedbackKind,
} from '@/lib/contact'
import { CONTACT_EMAIL } from '@/lib/project'
import { m } from '@/paraglide/messages'

const KIND_LABELS: Record<FeedbackKind, () => string> = {
  idea: m.contact_kind_idea,
  feeling: m.contact_kind_feeling,
  bug: m.contact_kind_bug,
  other: m.contact_kind_other,
}

type Status = 'editing' | 'sending' | 'sent' | 'failed' | 'unavailable'

/**
 * The feedback form: what it is about, the message, an optional address to get an answer, and
 * the technical details only if the user ticks the box. A failure keeps the message and offers
 * the e-mail address instead.
 */
export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [withContext, setWithContext] = useState(false)
  const [botcheck, setBotcheck] = useState('')
  const [status, setStatus] = useState<Status>('editing')
  const ids = { message: useId(), email: useId(), context: useId() }

  if (status === 'sent') {
    return (
      <div className="space-y-3 rounded-md bg-good/12 p-4 ring-1 ring-good/40" role="status">
        <p className="flex items-center gap-2 text-lg font-medium text-good">
          <CircleCheck aria-hidden className="size-5" />
          {m.contact_sent_title()}
        </p>
        <p>{m.contact_sent_body()}</p>
        <Button
          variant="outline"
          onClick={() => {
            setMessage('')
            setStatus('editing')
          }}
        >
          {m.contact_send_another()}
        </Button>
      </div>
    )
  }

  const submit = async () => {
    setStatus('sending')
    try {
      await sendFeedback({
        kind,
        message: message.trim(),
        email: email.trim() || undefined,
        context: withContext ? technicalContext() : undefined,
        botcheck,
      })
      setStatus('sent')
    } catch (error) {
      setStatus(error instanceof ContactNotConfigured ? 'unavailable' : 'failed')
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (message.trim() && status !== 'sending') void submit()
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm text-font-clear">{m.contact_kind()}</legend>
        <ToggleGroup
          type="single"
          value={kind}
          onValueChange={(value) => {
            if (!value) return
            setKind(value as FeedbackKind)
            // A bug report needs the technical details: ticked for bugs, unticked otherwise.
            setWithContext(value === 'bug')
          }}
          className="flex-wrap"
        >
          {FEEDBACK_KINDS.map((item) => (
            <ToggleGroupItem key={item} value={item} size="sm" className={CHIP_CLASS}>
              {KIND_LABELS[item]()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={ids.message}>{m.contact_message()}</Label>
        <textarea
          id={ids.message}
          required
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={m.contact_message_placeholder()}
          className="w-full rounded-lg border border-input bg-input/30 px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.email}>{m.contact_email()}</Label>
        <Input
          id={ids.email}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={m.contact_email_placeholder()}
          className="max-w-sm"
        />
      </div>

      <div className="flex items-start gap-2 text-sm">
        <Checkbox
          id={ids.context}
          checked={withContext}
          onCheckedChange={(checked) => setWithContext(checked === true)}
          className="mt-0.5 border-font-dim"
        />
        <Label htmlFor={ids.context} className="leading-snug font-normal text-muted-foreground">
          {m.contact_context()}
        </Label>
      </div>

      {/* Honeypot: hidden from people, filled by robots, discarded by Web3Forms. */}
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        aria-hidden
        className="hidden"
        checked={botcheck !== ''}
        onChange={(event) => setBotcheck(event.target.checked ? 'on' : '')}
      />

      {(status === 'failed' || status === 'unavailable') && (
        <p className="text-sm text-bad" role="alert">
          {status === 'failed' ? m.contact_failed() : m.contact_unavailable()}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </p>
      )}

      <Button type="submit" size="lg" disabled={!message.trim() || status === 'sending'}>
        {status === 'sending' ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Send data-icon="inline-start" />
        )}
        {status === 'sending' ? m.contact_sending() : m.contact_send()}
      </Button>
    </form>
  )
}
