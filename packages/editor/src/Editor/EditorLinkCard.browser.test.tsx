import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { clickIntoEditor, selectParagraph } from './testUtils'

const LABEL = 'Event description'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender?ref=email'
const CARD = 'Link actions'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const VARIABLES: EditorVariable[] = [
  {
    key: 'unsubscribe_url',
    label: 'Unsubscribe page',
    kind: 'url',
    tokens: { ae: '#OptOut#' }
  }
]

const linked = (text: string, attrs: Record<string, unknown>) => ({
  type: 'paragraph',
  content: [
    { type: 'text', text: 'Grab ' },
    { type: 'text', text, marks: [{ type: 'link', attrs }] },
    { type: 'text', text: ' soon.' }
  ]
})

const valueOf = (
  preset: 'rich' | 'email',
  block: JSONContent
): EditorValue => ({
  version: 1,
  preset,
  doc: {
    type: 'doc',
    content: [
      block,
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
})

function renderEditor(value: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <div style={{ padding: '96px 24px' }}>
      <Editor
        aria-label={LABEL}
        preset={value.preset}
        variables={VARIABLES}
        defaultValue={value}
        onValueChange={onValueChange}
      />
    </div>
  )
  return onValueChange
}

async function caretIn(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(within(textbox).getByText(text))
  return textbox
}

const card = () => screen.findByRole('toolbar', { name: CARD })

describe('Editor link card', () => {
  it('shows where a link goes, opening it in a new tab', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    await caretIn('your tickets')

    const target = within(await card()).getByRole('link')
    expect(target).toHaveTextContent('oztix.com.au/ochre-kite-weekender')
    expect(target).toHaveAttribute('href', TICKETS)
    expect(target).toHaveAttribute('target', '_blank')
    expect(target).toHaveAttribute('title', TICKETS)
  })

  it('hangs under the link, clear of its text', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    const textbox = await caretIn('your tickets')

    const box = (await card()).getBoundingClientRect()
    const link = within(textbox)
      .getByText('your tickets')
      .getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(link.bottom)
    expect(Math.abs(box.left - link.left)).toBeLessThanOrEqual(16)
  })

  it('names a link variable rather than an address', async () => {
    renderEditor(
      valueOf('email', linked('Unsubscribe', { variable: 'unsubscribe_url' }))
    )
    await caretIn('Unsubscribe')

    const shown = await card()
    expect(within(shown).getByText('Unsubscribe page')).toBeVisible()
    expect(within(shown).queryByRole('link')).toBe(null)
  })

  it('opens the link editor from Edit', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    await caretIn('your tickets')

    await userEvent.click(
      within(await card()).getByRole('button', { name: 'Edit link' })
    )

    const url = await screen.findByRole('textbox', { name: 'Link' })
    expect(url).toHaveValue(TICKETS)
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })

  it('removes the whole link from Remove, keeping the caret in the text', async () => {
    const onValueChange = renderEditor(
      valueOf('rich', linked('your tickets', { href: TICKETS }))
    )
    const textbox = await caretIn('your tickets')

    await userEvent.click(
      within(await card()).getByRole('button', { name: 'Remove link' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content?.[0]
      ).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Grab your tickets soon.' }]
      })
    )
    await waitFor(() => expect(textbox).toHaveFocus())
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })

  it('shows only at a caret in a link', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    const textbox = await caretIn('Doors 7pm')
    await screen.findByRole('toolbar', { name: 'Formatting' })
    expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)

    await selectParagraph(within(textbox).getByText('your tickets'))
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })
})
