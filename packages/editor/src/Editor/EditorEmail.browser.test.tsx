import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'
import { LINE_END } from './testUtils'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})

const layout = (lead: string): JSONContent => ({
  type: 'doc',
  content: [
    {
      type: 'section',
      content: [
        {
          type: 'columns',
          content: [
            { type: 'column', content: [p(lead)] },
            {
              type: 'column',
              content: [
                p('All ages.'),
                {
                  type: 'button',
                  attrs: { href: TICKETS },
                  content: [{ type: 'text', text: 'Get tickets' }]
                }
              ]
            }
          ]
        }
      ]
    },
    { type: 'spacer', attrs: { height: 32 } },
    { type: 'horizontalRule' },
    p('See you there.')
  ]
})

const newsletter: EditorValue = {
  version: 1,
  preset: 'email',
  doc: layout('Doors 7pm')
}

// Firefox ignores the clipboardData a ClipboardEvent is made with, so the data
// is set on the event itself.
function pasteHtml(target: HTMLElement, html: string) {
  const clipboardData = new DataTransfer()
  clipboardData.setData('text/html', html)
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  target.dispatchEvent(event)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Editor with the email preset', () => {
  it('edits text in a column of a saved layout and saves the layout with it', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={newsletter}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveTextContent('Doors 7pm'))

    await userEvent.click(screen.getByText('Doors 7pm'))
    await userEvent.keyboard(`${LINE_END}, bar till late`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith({
        version: 1,
        preset: 'email',
        doc: layout('Doors 7pm, bar till late')
      })
    )
  })

  it('pastes a copied button as a button, not a link', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor aria-label={LABEL} preset='email' onValueChange={onValueChange} />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)
    await waitFor(() => expect(textbox).toHaveFocus())

    pasteHtml(
      textbox,
      `<p>Doors 7pm</p><a data-type="button" href="${TICKETS}">Get tickets</a>`
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith({
        version: 1,
        preset: 'email',
        doc: {
          type: 'doc',
          content: expect.arrayContaining([
            p('Doors 7pm'),
            {
              type: 'button',
              attrs: { href: TICKETS },
              content: [{ type: 'text', text: 'Get tickets' }]
            }
          ])
        }
      })
    )
  })
})
