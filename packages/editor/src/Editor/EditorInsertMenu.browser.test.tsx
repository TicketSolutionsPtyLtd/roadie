import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Newsletter'

const p = (text?: string): JSONContent =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }

const column = (...content: JSONContent[]): JSONContent => ({
  type: 'column',
  content
})

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

function renderEmail(props: Partial<React.ComponentProps<typeof Editor>> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const insertMenu = () => screen.findByRole('listbox', { name: 'Insert' })

const optionNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent)

// The menu portals to the body, so React unmounts it before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor insert menu', () => {
  it('opens on / with the first option active', async () => {
    renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')

    const listbox = await insertMenu()
    const [first] = within(listbox).getAllByRole('option')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(textbox).toHaveAttribute('aria-activedescendant', first!.id)
    expect(textbox).toHaveAttribute('aria-controls', listbox.id)
    expect(textbox).toHaveFocus()
    expect(optionNames(listbox)).toEqual([
      'Paragraph',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Bulleted list',
      'Numbered list',
      'Section',
      '2 columns',
      '3 columns',
      '4 columns',
      'Spacer',
      'Divider'
    ])
  })

  it.each([
    ['section', 'Section', [{ type: 'section', content: [p()] }, p()]],
    [
      'two columns',
      '2 columns',
      [{ type: 'columns', content: [column(p()), column(p())] }, p()]
    ],
    [
      'four columns',
      '4 columns',
      [
        {
          type: 'columns',
          content: [column(p()), column(p()), column(p()), column(p())]
        },
        p()
      ]
    ],
    ['a spacer', 'Spacer', [{ type: 'spacer', attrs: { height: 32 } }, p()]],
    ['a divider', 'Divider', [{ type: 'horizontalRule' }, p()]],
    ['a heading', 'Heading 3', [{ type: 'heading', attrs: { level: 3 } }, p()]],
    [
      'a list',
      'Bulleted list',
      [
        { type: 'bulletList', content: [{ type: 'listItem', content: [p()] }] },
        p()
      ]
    ]
  ])('inserts %s by keyboard', async (_, name, content) => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/')
    const listbox = await insertMenu()
    const names = optionNames(listbox)
    for (let at = 0; at < names.indexOf(name); at++) {
      await userEvent.keyboard('{ArrowDown}')
    }
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(email(...content))
    )
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('puts the caret in the first column of new columns', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/2 col{Enter}Doors 7pm')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          { type: 'columns', content: [column(p('Doors 7pm')), column(p())] },
          p()
        )
      )
    )
  })

  it('inserts after a line with text, removing what was typed', async () => {
    const onValueChange = renderEmail({ defaultValue: email(p('Doors 7pm')) })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End} /div{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm '), { type: 'horizontalRule' }, p())
      )
    )
  })

  it('filters as you type, and closes when nothing matches', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/col')
    expect(optionNames(await insertMenu())).toEqual([
      '2 columns',
      '3 columns',
      '4 columns'
    ])

    await userEvent.keyboard('z')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
  })

  it('moves the active option with the arrow keys, wrapping at the ends', async () => {
    renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/col{ArrowDown}')
    const options = within(await insertMenu()).getAllByRole('option')
    await waitFor(() =>
      expect(textbox).toHaveAttribute('aria-activedescendant', options[1]!.id)
    )

    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    await waitFor(() =>
      expect(textbox).toHaveAttribute('aria-activedescendant', options[2]!.id)
    )
    expect(options[2]).toHaveAttribute('aria-selected', 'true')
  })

  it('makes the first match active again as the filter changes', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/')
    await insertMenu()
    await userEvent.keyboard('{ArrowUp}div{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'horizontalRule' }, p())
      )
    )
  })

  it('types / as text in a button label', async () => {
    const button: JSONContent = {
      type: 'button',
      attrs: { href: 'https://example.com/tickets' },
      content: [{ type: 'text', text: 'Get tickets' }]
    }
    const onValueChange = renderEmail({ defaultValue: email(button) })
    await userEvent.dblClick(await screen.findByText('Get tickets'))

    await userEvent.keyboard('/')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ ...button, content: [{ type: 'text', text: 'Get /' }] }, p())
      )
    )
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('closes on Escape, keeping what was typed', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/sec')
    await insertMenu()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(textbox).not.toHaveAttribute('aria-activedescendant')
    expect(onValueChange).toHaveBeenLastCalledWith(email(p('/sec')))
  })

  it('inserts the option clicked', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/')
    await userEvent.click(
      within(await insertMenu()).getByRole('option', { name: 'Spacer' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'spacer', attrs: { height: 32 } }, p())
      )
    )
  })

  it('offers no section or columns inside a column', async () => {
    renderEmail({
      defaultValue: email({
        type: 'columns',
        content: [column(p('Doors 7pm')), column(p('All ages'))]
      })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End} /')

    const names = optionNames(await insertMenu())
    expect(names).toContain('Spacer')
    expect(names).not.toContain('Section')
    expect(names).not.toContain('2 columns')
  })

  it('offers only the other list type in a list', async () => {
    renderEmail({
      defaultValue: email({
        type: 'bulletList',
        content: [{ type: 'listItem', content: [p('Doors 7pm')] }]
      })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End} /')

    expect(optionNames(await insertMenu())).toEqual(['Numbered list'])
  })

  it('offers Image with onUploadImage', async () => {
    renderEmail({
      onUploadImage: async () => ({ src: 'https://example.com/crowd.png' })
    })
    await focusedTextbox()

    await userEvent.keyboard('/ima')

    expect(optionNames(await insertMenu())).toEqual(['Image'])
  })

  it.each(['basic', 'rich'] as const)(
    'opens no menu in the %s preset',
    async (preset) => {
      const onValueChange = renderEmail({ preset })
      await focusedTextbox()

      await userEvent.keyboard('/')

      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith({
          version: 1,
          preset,
          doc: { type: 'doc', content: [p('/')] }
        })
      )
      expect(screen.queryByRole('listbox')).toBe(null)
    }
  )

  it('refuses an uploaded image served from a path on the site', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm')),
      onUploadImage: async () => ({ src: '/images/crowd.png' })
    })
    const textbox = await focusedTextbox()

    const clipboardData = new DataTransfer()
    clipboardData.items.add(
      new File(['png'], 'crowd.png', { type: 'image/png' })
    )
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true
    })
    Object.defineProperty(event, 'clipboardData', { value: clipboardData })
    textbox.dispatchEvent(event)

    expect((await screen.findByRole('alert')).textContent).toMatch(/https/)
    expect(textbox.querySelector('img')).toBe(null)
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('Editor email paste', () => {
  it('reads a pasted h1 as a heading 2 and drops an embedded player', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()

    const clipboardData = new DataTransfer()
    clipboardData.setData(
      'text/html',
      '<h1>Ochre Kite</h1><iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ"></iframe><p>Doors 7pm</p>'
    )
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true
    })
    Object.defineProperty(event, 'clipboardData', { value: clipboardData })
    textbox.dispatchEvent(event)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Ochre Kite' }]
          },
          p('Doors 7pm')
        )
      )
    )
  })
})
