import { createFileRoute } from '@tanstack/react-router'
import { Heart, MessageSquare } from 'lucide-react'
import type { ReactNode } from 'react'
import { FeedbackForm } from '@/features/contact/FeedbackForm'
import { CONTACT_EMAIL } from '@/lib/project'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-font-clear">{title}</h2>
      {children}
    </section>
  )
}

/** A translated sentence with one phrase in bold: the phrase is its own message, passed as a parameter. */
function Emphasized({
  render,
  emphasis,
}: {
  render: (emphasis: string) => string
  emphasis: string
}) {
  const marker = '\u0000'
  const [before, after] = render(marker).split(marker)
  return (
    <>
      {before}
      <strong className="font-semibold text-font-clear">{emphasis}</strong>
      {after}
    </>
  )
}

/**
 * Who makes CraftYourChess, what it is for, and the invitation to say anything about it. On large screens
 * the form sits in a right column next to the text; on phones it follows it.
 */
function ContactPage() {
  return (
    <article className="space-y-8 leading-relaxed">
      <h1 className="flex items-center gap-3 text-3xl font-medium text-font-clear">
        <MessageSquare aria-hidden className="size-7 shrink-0" />
        {m.contact_title()}
      </h1>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-prose space-y-8">
          <Section title={m.contact_about_title()}>
            <p>
              <Emphasized
                render={(emphasis) => m.contact_about_body({ emphasis })}
                emphasis={m.contact_about_emphasis()}
              />
            </p>
            <p>{m.contact_project_body()}</p>
            <p>{m.contact_project_curious()}</p>
            <p>{m.contact_project_reach()}</p>
          </Section>

          <Section title={m.contact_feedback_title()}>
            <p>{m.contact_feedback_body()}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>{m.contact_feedback_features()}</li>
              <li>{m.contact_feedback_complaints()}</li>
              <li>{m.contact_feedback_bugs()}</li>
              <li>{m.contact_feedback_ideas()}</li>
            </ul>
            <p>{m.contact_lead()}</p>
            <div className="pt-4">
              <p className="flex items-center gap-3 rounded-lg bg-card p-4 text-lg text-font-clear">
                <Heart aria-hidden className="size-6 shrink-0 fill-current text-bad" />
                {m.contact_feedback_thanks()}
              </p>
            </div>
          </Section>
        </div>

        <div className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Section title={m.contact_form_title()}>
            <FeedbackForm />
          </Section>

          <p className="text-sm text-muted-foreground">
            {m.contact_mail_alternative()}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="whitespace-nowrap text-foreground underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </article>
  )
}
