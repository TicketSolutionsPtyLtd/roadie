import { render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { LINE_END } from './testUtils'

const LABEL = 'Newsletter'

// Unstyled, the block handle beside the caret's block sits in the flow.
let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

// Computed colours can be oklch, so a canvas turns any of them into RGB.
function luminance(color: string) {
  const context = document.createElement('canvas').getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

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

  it('submits an edited layout with no rules as it saved it', async () => {
    let submitted: FormData | undefined
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = new FormData(event.currentTarget)
        }}
      >
        <Editor
          aria-label={LABEL}
          name='newsletter'
          defaultValue={newsletter}
        />
        <button type='submit'>Save</button>
      </form>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveTextContent('Doors 7pm'))
    await userEvent.click(screen.getByText('Doors 7pm'))
    await userEvent.keyboard(`${LINE_END}, bar till late`)
    await waitFor(() =>
      expect(textbox).toHaveTextContent('Doors 7pm, bar till late')
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(JSON.parse(submitted!.get('newsletter') as string)).toEqual({
      version: 1,
      preset: 'email',
      doc: layout('Doors 7pm, bar till late')
    })
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

  it('shows a merge tag as a chip with its label, not as text to edit', async () => {
    render(
      <Editor
        aria-label={LABEL}
        variables={[
          {
            key: 'first_name',
            label: 'First name',
            tokens: { ae: '#FirstName#' }
          }
        ]}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Hi ' },
                  { type: 'variable', attrs: { key: 'first_name' } },
                  { type: 'text', text: ' and ' },
                  { type: 'variable', attrs: { key: 'event_name' } }
                ]
              }
            ]
          }
        }}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() =>
      expect(textbox).toHaveTextContent('Hi First name and event_name')
    )

    const known = screen.getByText('First name')
    expect(known.isContentEditable).toBe(false)
    expect(known.closest('[data-slot="editor-variable"]')).not.toHaveAttribute(
      'data-invalid'
    )
    const unknown = screen.getByText('event_name')
    expect(unknown.isContentEditable).toBe(false)
    expect(unknown.closest('[data-slot="editor-variable"]')).toHaveAttribute(
      'data-invalid'
    )
  })

  it('shows a merge tag in a button so it reads against the button’s fill', async () => {
    render(
      <Editor
        aria-label={LABEL}
        variables={[
          {
            key: 'first_name',
            label: 'First name',
            tokens: { ae: '#FirstName#' }
          }
        ]}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'button',
                attrs: { href: TICKETS },
                content: [
                  { type: 'text', text: 'See your tickets, ' },
                  { type: 'variable', attrs: { key: 'first_name' } }
                ]
              }
            ]
          }
        }}
      />
    )
    const chip = await screen.findByText('First name')
    const button = chip.closest('[data-slot="editor-variable"]')!.parentElement!

    const fill = luminance(getComputedStyle(button).backgroundColor)
    const chipFill = luminance(getComputedStyle(chip).backgroundColor)
    expect(Math.abs(fill - chipFill)).toBeGreaterThan(0.5)
  })

  it('keeps a button’s fill while the caret is in it, showing focus around it', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'button',
                attrs: { href: TICKETS },
                content: [{ type: 'text', text: 'See your tickets' }]
              }
            ]
          }
        }}
      />
    )
    const label = await screen.findByText('See your tickets')
    const button = label.closest<HTMLElement>('[data-type="button"]')!
    const rest = getComputedStyle(button).backgroundColor

    await userEvent.click(label)

    await waitFor(() => expect(button).toHaveAttribute('data-focused-block'))
    expect(getComputedStyle(button).backgroundColor).toBe(rest)
    expect(getComputedStyle(button).outlineStyle).toBe('solid')
  })

  it('shows a merge tag by its key when the editor lists no variables', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'variable', attrs: { key: 'first_name' } }]
              }
            ]
          }
        }}
      />
    )
    await screen.findByRole('textbox', { name: LABEL })

    const chip = await screen.findByText('first_name')
    expect(chip.isContentEditable).toBe(false)
    expect(chip.closest('[data-slot="editor-variable"]')).not.toHaveAttribute(
      'data-invalid'
    )
  })

  it('loads with a leading image unselected, until it is clicked', async () => {
    const { container } = render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'image',
                attrs: {
                  src: 'https://example.test/header.webp',
                  alt: 'A crowd'
                }
              },
              p('Doors 7pm')
            ]
          }
        }}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveTextContent('Doors 7pm'))
    const image = await screen.findByAltText('A crowd')
    const view = image.closest('[data-slot="editor-image"]')!

    expect(view).not.toHaveAttribute('data-selected')
    expect(container.querySelector('.ProseMirror-selectednode')).toBeNull()

    await userEvent.click(image)
    await waitFor(() => expect(view).toHaveAttribute('data-selected'))
  })
})
