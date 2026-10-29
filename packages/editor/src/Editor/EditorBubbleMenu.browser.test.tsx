import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'
import { LINE_END, MOD, selectParagraph } from './testUtils'

const LABEL = 'Event description'
const MENU = 'Selection formatting'
const CROWD = '/images/crowd.webp'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const paragraph = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})

const lineup: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [paragraph('Ochre Kite Weekender'), paragraph('Gates open at 4pm')]
  }
}

const cell = (type: string, text: string) => ({
  type,
  content: [paragraph(text)]
})

const withTable: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      paragraph('Gates open at 4pm'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [cell('tableHeader', 'Time'), cell('tableHeader', 'Act')]
          },
          {
            type: 'tableRow',
            content: [cell('tableCell', '9pm'), cell('tableCell', 'Ochre Kite')]
          }
        ]
      }
    ]
  }
}

function BubbleEditor({ children, ...props }: Partial<EditorProps>) {
  return (
    <Editor aria-label={LABEL} defaultValue={lineup} {...props}>
      <Editor.Toolbar />
      <Editor.Content />
      <Editor.BubbleMenu>{children}</Editor.BubbleMenu>
    </Editor>
  )
}

const lastValue = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall![0] as EditorValue

async function selectText(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await selectParagraph(within(textbox).getByText(text))
  return textbox
}

const menu = () => screen.findByRole('toolbar', { name: MENU })
const noMenu = () =>
  waitFor(() =>
    expect(screen.queryByRole('toolbar', { name: MENU })).toBe(null)
  )

const itemsOf = (toolbar: HTMLElement) =>
  within(toolbar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent)

describe('Editor.BubbleMenu', () => {
  it('shows the inline marks and Link over a text selection', async () => {
    render(<BubbleEditor />)
    await selectText('Gates open at 4pm')

    const toolbar = await menu()
    await waitFor(() => expect(toolbar).toBeVisible())
    expect(itemsOf(toolbar)).toEqual(['Bold', 'Italic', 'Underline', 'Link'])
  })

  it('shows nothing until the part is added', async () => {
    render(<Editor aria-label={LABEL} defaultValue={lineup} />)
    await selectText('Gates open at 4pm')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bold' })).toBeEnabled()
    )
    expect(screen.queryByRole('toolbar', { name: MENU })).toBe(null)
  })

  it('hides when the selection collapses', async () => {
    render(<BubbleEditor />)
    await selectText('Gates open at 4pm')
    await menu()

    await userEvent.keyboard('{ArrowRight}')

    await noMenu()
  })

  it('bolds the selection from the menu, and presses Bold', async () => {
    const onValueChange = vi.fn()
    render(<BubbleEditor onValueChange={onValueChange} />)
    await selectText('Gates open at 4pm')

    const toolbar = await menu()
    const bold = within(toolbar).getByRole('button', { name: 'Bold' })
    await userEvent.click(bold)

    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content?.[1]).toEqual({
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'bold' }], text: 'Gates open at 4pm' }
        ]
      })
    )
    expect(bold).toHaveAttribute('aria-pressed', 'true')
    expect(toolbar).toBeVisible()
  })

  it('moves focus to the menu with Alt+F10 and back to the selection with Escape', async () => {
    const onValueChange = vi.fn()
    render(<BubbleEditor onValueChange={onValueChange} />)
    const textbox = await selectText('Gates open at 4pm')
    const toolbar = await menu()

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    const italic = within(toolbar).getByRole('button', { name: 'Italic' })
    expect(italic).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content?.[1]?.content?.[0]).toEqual({
        type: 'text',
        marks: [{ type: 'italic' }],
        text: 'Gates open at 4pm'
      })
    )

    await userEvent.keyboard('{Alt>}{F10}{/Alt}{Escape}')
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard('Doors at 5pm')
    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content?.[1]?.content).toEqual([
        { type: 'text', marks: [{ type: 'italic' }], text: 'Doors at 5pm' }
      ])
    )
  })

  it('opens the link editor from Link, hiding while it’s open', async () => {
    render(<BubbleEditor />)
    await selectText('Gates open at 4pm')
    const toolbar = await menu()

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Link' }))

    const url = await screen.findByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(url).toHaveFocus())
    await noMenu()
  })

  it('hides while the link editor opened with Mod+K is open', async () => {
    render(<BubbleEditor />)
    await selectText('Gates open at 4pm')
    await menu()

    await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)

    await screen.findByRole('textbox', { name: 'Link' })
    await noMenu()
  })

  it('stays hidden on a cell selection', async () => {
    render(<BubbleEditor defaultValue={withTable} />)
    const textbox = await selectText('Gates open at 4pm')
    await menu()

    await selectParagraph(within(textbox).getByText('Time'))

    await screen.findByRole('toolbar', { name: 'Table actions' })
    await noMenu()
  })

  it('stays above text in a table that starts the content, clear of the table actions below it', async () => {
    const [, table] = withTable.doc.content ?? []
    render(
      <BubbleEditor
        defaultValue={{
          ...withTable,
          doc: {
            type: 'doc',
            content: [table!, paragraph('Gates open at 4pm')]
          }
        }}
      />
    )
    const textbox = await selectText('Gates open at 4pm')
    await menu()
    await userEvent.keyboard('{ArrowRight}')
    await noMenu()
    const text = within(textbox).getByText('9pm')
    await userEvent.click(text)
    const actions = await screen.findByRole('toolbar', {
      name: 'Table actions'
    })
    await userEvent.keyboard(
      `${LINE_END}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}`
    )
    const bubble = await menu()

    await waitFor(() =>
      expect(bubble.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        text.getBoundingClientRect().top
      )
    )
    const a = bubble.getBoundingClientRect()
    const b = actions.getBoundingClientRect()
    expect(b.top).toBeGreaterThanOrEqual(a.bottom)
  })

  it('hides when a Mod-click selects the block', async () => {
    render(<BubbleEditor />)
    const textbox = await selectText('Gates open at 4pm')
    await menu()

    await userEvent.click(within(textbox).getByText('Ochre Kite Weekender'), {
      modifiers: ['ControlOrMeta']
    })

    await noMenu()
  })

  it('hides when an image is selected', async () => {
    render(
      <BubbleEditor
        defaultValue={{
          version: 1,
          preset: 'rich',
          doc: {
            type: 'doc',
            content: [
              paragraph('Gates open at 4pm'),
              { type: 'image', attrs: { src: CROWD, alt: 'The crowd' } }
            ]
          }
        }}
      />
    )
    const textbox = await selectText('Gates open at 4pm')
    await menu()

    await userEvent.click(textbox.querySelector('img')!)

    await screen.findByRole('toolbar', { name: 'Image actions' })
    await noMenu()
  })

  it.each<[string, Partial<EditorProps>]>([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }]
  ])('hides when the editor turns %s from the menu', async (_, props) => {
    const { rerender } = render(<BubbleEditor />)
    await selectText('Gates open at 4pm')
    const toolbar = await menu()
    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    expect(toolbar).toContainElement(document.activeElement as HTMLElement)

    rerender(<BubbleEditor {...props} />)

    await noMenu()
  })

  it('goes below text in a table, clear of the table actions', async () => {
    render(<BubbleEditor defaultValue={withTable} />)
    // A double or triple click in a cell selects the cell, so the keys
    // select text, once the menu has shown long after the editor took focus.
    const textbox = await selectText('Gates open at 4pm')
    await menu()
    const text = within(textbox).getByText('Time')
    await userEvent.click(text)
    const table = await screen.findByRole('toolbar', { name: 'Table actions' })
    await userEvent.keyboard(
      `${LINE_END}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}`
    )
    const bubble = await menu()

    await waitFor(() =>
      expect(bubble.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        text.getBoundingClientRect().bottom
      )
    )
    const a = bubble.getBoundingClientRect()
    const b = table.getBoundingClientRect()
    const overlaps =
      a.left < b.right &&
      b.left < a.right &&
      a.top < b.bottom &&
      b.top < a.bottom
    expect(overlaps).toBe(false)
  })

  it('puts its children after the preset controls', async () => {
    render(
      <BubbleEditor>
        <Toolbar.Button>Highlight</Toolbar.Button>
      </BubbleEditor>
    )
    await selectText('Gates open at 4pm')

    expect(itemsOf(await menu()).at(-1)).toBe('Highlight')
  })

  it('sits just above the selection in a scrolled container', async () => {
    const filler = Array.from({ length: 12 }, (_, index) =>
      paragraph(`Set time ${index + 1}`)
    )
    render(
      <div style={{ height: 400, overflow: 'auto' }} data-testid='scroller'>
        <BubbleEditor
          defaultValue={{
            version: 1,
            preset: 'rich',
            doc: {
              type: 'doc',
              content: [...filler, paragraph('Gates open at 4pm'), ...filler]
            }
          }}
        />
      </div>
    )
    const scroller = screen.getByTestId('scroller')
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const target = within(textbox).getByText('Gates open at 4pm')
    target.scrollIntoView({ block: 'center' })
    await selectParagraph(target)
    const toolbar = await menu()

    const expectAbove = () => {
      const text = target.getBoundingClientRect()
      const bar = toolbar.getBoundingClientRect()
      expect(bar.bottom).toBeLessThanOrEqual(text.top)
      expect(text.top - bar.bottom).toBeLessThan(24)
      expect(bar.right).toBeGreaterThan(text.left)
      expect(bar.left).toBeLessThan(text.right)
    }
    await waitFor(expectAbove)

    scroller.scrollTop += 40
    await waitFor(expectAbove)
  })
})
