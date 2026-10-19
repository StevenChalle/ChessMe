/**
 * The contact form's messages, sent by Web3Forms (https://web3forms.com), which forwards them by
 * e-mail: no server of our own. Its access key is public by design (it only allows sending to
 * the address it was created for), set with VITE_WEB3FORMS_KEY. Declared on the /legal page.
 *
 * MOCK until the account exists: without a key, development pretends to send (logged in the
 * console); a production build refuses, and the page offers the e-mail address instead.
 */

const ENDPOINT = 'https://api.web3forms.com/submit'
const ACCESS_KEY: string | undefined = import.meta.env.VITE_WEB3FORMS_KEY

export type FeedbackKind = 'idea' | 'feeling' | 'bug' | 'other'
export const FEEDBACK_KINDS: FeedbackKind[] = ['idea', 'feeling', 'bug', 'other']

export type Feedback = {
  kind: FeedbackKind
  message: string
  /** To get an answer; optional */
  email?: string
  /** Page, browser, language, screen: only when the user ticks the box */
  context?: Record<string, string>
  /** Honeypot: a field people never see, filled by robots only */
  botcheck?: string
}

export class ContactNotConfigured extends Error {
  constructor() {
    super('The contact form is not set up yet')
  }
}

/** Whether messages can really be sent (an access key is configured). */
export const contactConfigured = Boolean(ACCESS_KEY)

/** What Web3Forms receives: its own fields, then ours (they show in the e-mail). */
export function feedbackPayload(feedback: Feedback, accessKey: string): Record<string, string> {
  return {
    access_key: accessKey,
    subject: `ChessMe · ${feedback.kind}`,
    from_name: 'ChessMe',
    botcheck: feedback.botcheck ?? '',
    ...(feedback.email ? { email: feedback.email, replyto: feedback.email } : {}),
    kind: feedback.kind,
    message: feedback.message,
    ...Object.fromEntries(
      Object.entries(feedback.context ?? {}).map(([key, value]) => [`context_${key}`, value]),
    ),
  }
}

/** The technical details a bug report benefits from, without anything personal. */
export function technicalContext(): Record<string, string> {
  return {
    page: window.location.pathname + window.location.search,
    browser: navigator.userAgent,
    language: navigator.language,
    screen: `${window.innerWidth}×${window.innerHeight}`,
  }
}

export async function sendFeedback(feedback: Feedback): Promise<void> {
  if (!ACCESS_KEY) {
    if (!import.meta.env.DEV) throw new ContactNotConfigured()
    // MOCK: nothing leaves the browser.
    console.info('Contact form (mock, not sent):', feedbackPayload(feedback, 'MOCK'))
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(feedbackPayload(feedback, ACCESS_KEY)),
  })
  const result = (await response.json().catch(() => ({}))) as { success?: boolean }
  if (!response.ok || !result.success) throw new Error(`Web3Forms: ${response.status}`)
}
