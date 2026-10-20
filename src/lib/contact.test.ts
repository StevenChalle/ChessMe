import { describe, expect, it } from 'vitest'
import { feedbackPayload } from './contact'

describe('feedbackPayload', () => {
  it('sends the message, the kind and the access key', () => {
    expect(feedbackPayload({ kind: 'bug', message: 'Broken' }, 'KEY')).toEqual({
      access_key: 'KEY',
      subject: 'CraftYourChess · bug',
      from_name: 'CraftYourChess',
      botcheck: '',
      kind: 'bug',
      message: 'Broken',
    })
  })

  it('adds the reply address and the technical context only when given', () => {
    const payload = feedbackPayload(
      { kind: 'idea', message: 'More themes', email: 'a@b.c', context: { page: '/analysis' } },
      'KEY',
    )
    expect(payload).toMatchObject({ email: 'a@b.c', replyto: 'a@b.c', context_page: '/analysis' })
  })
})
