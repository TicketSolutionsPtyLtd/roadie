import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Dialog } from '@oztix/roadie-components/dialog'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'
import { MOD, selectParagraph } from './testUtils'

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

const OPTION_LABEL = '[data-slot="editor-insert-label"]'

const insertMenu = () => screen.findByRole('listbox', { name: 'Insert' })

const optionNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('option')
    .map((option) => option.querySelector(OPTION_LABEL)?.textContent)

const groupNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('group')
    .map((group) => [
      document.getElementById(group.getAttribute('aria-labelledby')!)
        ?.textContent,
      optionNames(group)
    ])

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
      'Divider',
      'Button',
      'Header',
      'Event',
      'Two events',
      'Lineup'
    ])
  })

  it('groups the options under headings, in the order the arrow keys take', async () => {
    renderEmail({
      onUploadImage: async () => ({ src: 'https://example.com/crowd.png' }),
      variables: [
        {
          key: 'first_name',
          label: 'First name',
          tokens: { ae: '#FirstName#' }
        }
      ]
    })
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    const listbox = await insertMenu()

    expect(groupNames(listbox)).toEqual([
      [
        'Text',
        [
          'Paragraph',
          'Heading 2',
          'Heading 3',
          'Heading 4',
          'Bulleted list',
          'Numbered list'
        ]
      ],
      ['Media', ['Image']],
      [
        'Layout',
        ['Section', '2 columns', '3 columns', '4 columns', 'Spacer', 'Divider']
      ],
      ['Email', ['Button', 'Merge tag']],
      ['Sections', ['Header', 'Event', 'Two events', 'Lineup']]
    ])
    const layout = within(listbox).getByRole('group', { name: 'Layout' })
    await userEvent.keyboard('{ArrowDown}'.repeat(7))
    await waitFor(() =>
      expect(textbox).toHaveAttribute(
        'aria-activedescendant',
        within(layout).getByRole('option', { name: 'Section' }).id
      )
    )
    await userEvent.keyboard('{ArrowUp}'.repeat(8))
    await waitFor(() =>
      expect(textbox).toHaveAttribute(
        'aria-activedescendant',
        within(listbox).getByRole('option', { name: 'Lineup' }).id
      )
    )
  })

  it('hides a group with no matches as the filter narrows', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/butt')

    expect(groupNames(await insertMenu())).toEqual([['Email', ['Button']]])
  })

  it.each([
    ['section', 'Section', [{ type: 'section', content: [p()] }]],
    [
      'two columns',
      '2 columns',
      [{ type: 'columns', content: [column(p()), column(p())] }]
    ],
    [
      'four columns',
      '4 columns',
      [
        {
          type: 'columns',
          content: [column(p()), column(p()), column(p()), column(p())]
        }
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
        email({
          type: 'columns',
          content: [column(p('Doors 7pm')), column(p())]
        })
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

  it('inserts before the next line, putting the caret there', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm'), p('All ages'))
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End} /div{Enter}18+ ')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm '), { type: 'horizontalRule' }, p('18+ All ages'))
      )
    )
  })

  it('puts a block with lines in place of the emptied line, leaving no empty line', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/section{Enter}Doors 7pm')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'section', content: [p('Doors 7pm')] })
      )
    )
  })

  it('leaves a section on Enter in its empty last line, as a list does', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({ type: 'section', content: [p('Doors 7pm')] })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End}{Enter}{Enter}All ages')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'section', content: [p('Doors 7pm')] }, p('All ages'))
      )
    )
  })

  it('keeps an empty line between a section’s lines on Enter', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'section',
        content: [p('Doors 7pm'), p('All ages')]
      })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End}{Enter}{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'section',
          content: [p('Doors 7pm'), p(), p(), p('All ages')]
        })
      )
    )
  })

  it('keeps the caret in an emptied line after a block goes before it', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/spa{Enter}See you there')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'spacer', attrs: { height: 32 } }, p('See you there'))
      )
    )
  })

  it('makes the option under the pointer active', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    const spacer = within(await insertMenu()).getByRole('option', {
      name: 'Spacer'
    })
    await userEvent.hover(spacer)
    await waitFor(() =>
      expect(textbox).toHaveAttribute('aria-activedescendant', spacer.id)
    )
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'spacer', attrs: { height: 32 } }, p())
      )
    )
  })

  it('filters as you type, down to a No blocks match row', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/col')
    expect(optionNames(await insertMenu())).toEqual([
      '2 columns',
      '3 columns',
      '4 columns'
    ])

    await userEvent.keyboard('z')
    await waitFor(async () =>
      expect(within(await insertMenu()).getByRole('option')).toHaveTextContent(
        'No blocks match'
      )
    )
  })

  it('ranks a match at the start of a name first, as /2 finds 2 columns before Heading 2', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/2')

    await waitFor(async () =>
      expect(optionNames(await insertMenu())).toEqual([
        '2 columns',
        'Heading 2'
      ])
    )
  })

  it.each([
    ['btn', ['Button']],
    ['cta', ['Button', 'Event']],
    ['h1', ['Heading 2']],
    ['img', ['Image']],
    ['hr', ['Divider']]
  ])('finds /%s', async (query, names) => {
    renderEmail({
      onUploadImage: async () => ({ src: 'https://example.com/crowd.png' })
    })
    await focusedTextbox()

    await userEvent.keyboard(`/${query}`)

    await waitFor(async () =>
      expect(optionNames(await insertMenu())).toEqual(names)
    )
  })

  // The email's divider has no markdown rule to show.
  it('shows the heading shortcut, and none for the divider', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/')
    const listbox = await insertMenu()
    const shortcut = (name: string) =>
      within(listbox)
        .getByRole('option', { name })
        .querySelector('[data-slot="editor-insert-shortcut"]')

    expect(shortcut('Heading 2')).toHaveTextContent('##')
    expect(shortcut('Divider')).toBe(null)
  })

  it('closes on Escape with nothing matching, without closing the dialog around it', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Title>Compose</Dialog.Title>
          <Editor aria-label={LABEL} preset='email' />
        </Dialog.Content>
      </Dialog>
    )
    await focusedTextbox()

    await userEvent.keyboard('/hero')
    await insertMenu()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(onOpenChange).not.toHaveBeenCalled()
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
    await selectParagraph(await screen.findByText('Get tickets'))

    await userEvent.keyboard('/')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ ...button, content: [{ type: 'text', text: '/' }] }, p())
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

  it('closes on Escape without closing the dialog around it', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Title>Compose</Dialog.Title>
          <Editor aria-label={LABEL} preset='email' />
        </Dialog.Content>
      </Dialog>
    )
    await focusedTextbox()

    await userEvent.keyboard('/sec')
    await insertMenu()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
    )
  })

  it('closes when focus leaves the editor', async () => {
    renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    await insertMenu()
    textbox.blur()

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(textbox).not.toHaveAttribute('aria-controls')
    expect(textbox).not.toHaveAttribute('aria-activedescendant')
  })

  it.each([
    ['/div', 'horizontalRule'],
    ['/sec', 'section'],
    ['/2 col', 'columns'],
    ['/spac', 'spacer'],
    ['/heading 2', 'heading'],
    ['/bullet', 'bulletList'],
    ['/numbered', 'orderedList']
  ])('undoes %s back to what was typed', async (typed, type) => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard(`${typed}{Enter}`)
    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall?.[0] as EditorValue | undefined)?.doc
          .content?.[0]?.type
      ).toBe(type)
    )
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(email(p(typed)))
    )
  })

  it.each(['Shift', MOD])(
    'leaves %s+Enter to break the line, inserting nothing',
    async (modifier) => {
      const onValueChange = renderEmail()
      await focusedTextbox()

      await userEvent.keyboard('/div')
      await insertMenu()
      await userEvent.keyboard(`{${modifier}>}{Enter}{/${modifier}}`)

      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith(
          email({
            type: 'paragraph',
            content: [{ type: 'text', text: '/div' }, { type: 'hardBreak' }]
          })
        )
      )
    }
  )

  it('stays under the / as a container around the editor scrolls', async () => {
    render(
      <div data-testid='scroller' style={{ height: 300, overflow: 'auto' }}>
        <div style={{ height: 100 }} />
        <Editor aria-label={LABEL} preset='email' />
        <div style={{ height: 1000 }} />
      </div>
    )
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    const listbox = await insertMenu()
    const line = textbox.querySelector('p')!
    const gap = () =>
      listbox.getBoundingClientRect().top - line.getBoundingClientRect().bottom
    await waitFor(() => expect(gap()).toBeGreaterThanOrEqual(0))
    const opened = gap()
    screen.getByTestId('scroller').scrollTop = 60

    await waitFor(() => expect(gap()).toBeCloseTo(opened, 0))
  })

  it('inserts the option clicked, keeping focus in the text', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()
    const onBlur = vi.fn()
    textbox.addEventListener('blur', onBlur)

    await userEvent.keyboard('/')
    await userEvent.click(
      within(await insertMenu()).getByRole('option', { name: 'Spacer' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'spacer', attrs: { height: 32 } }, p())
      )
    )
    expect(onBlur).not.toHaveBeenCalled()
  })

  it.each([
    ['header', ['Header']],
    ['banner', ['Header']],
    ['event', ['Event', 'Two events']],
    ['tickets', ['Event']],
    ['lineup', ['Lineup']],
    ['footer', ['Footer']],
    ['unsubscribe', ['Footer']]
  ])('finds the ready-made section /%s', async (query, names) => {
    renderEmail({
      variables: [
        {
          key: 'unsubscribe_url',
          label: 'Unsubscribe page',
          kind: 'url',
          tokens: { ae: '#OptOut#' }
        }
      ]
    })
    await focusedTextbox()

    await userEvent.keyboard(`/${query}`)

    await waitFor(async () =>
      expect(optionNames(await insertMenu())).toEqual(names)
    )
  })

  it('puts a ready-made section after the section with the caret, its first placeholder selected', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({ type: 'section', content: [p('Doors 7pm')] })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End} /header{Enter}Ochre Kite Weekender')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          { type: 'section', content: [p('Doors 7pm ')] },
          {
            type: 'section',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Ochre Kite Weekender' }]
              },
              p()
            ]
          }
        )
      )
    )
  })

  it('takes the emptied line out of the section it was typed in', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({ type: 'section', content: [p('Doors 7pm'), p()] })
    })
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{ArrowDown}/event{Enter}')

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map(
          ({ type, content }) => [type, content?.length]
        )
      ).toEqual([
        ['section', 1],
        ['section', 3]
      ])
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

    // A ready-made section goes after the list, as it goes after any block.
    expect(optionNames(await insertMenu())).toEqual([
      'Numbered list',
      'Header',
      'Event',
      'Two events',
      'Lineup'
    ])
  })

  it('uploads the image chosen, before the emptied line', async () => {
    const poster = 'https://assets.example.com/poster.webp'
    const onValueChange = renderEmail({
      onUploadImage: async () => ({ src: poster, alt: 'Festival poster' })
    })
    await focusedTextbox()
    const fileInput = screen.getByLabelText('Image file')
    const onPick = vi.fn()
    fileInput.addEventListener('click', (event) => {
      event.preventDefault()
      onPick()
    })

    await userEvent.keyboard('/ima{Enter}')
    await waitFor(() => expect(onPick).toHaveBeenCalled())
    await userEvent.upload(
      fileInput,
      new File(['png'], 'poster.png', { type: 'image/png' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          {
            type: 'image',
            attrs: expect.objectContaining({
              src: poster,
              alt: 'Festival poster'
            })
          },
          p()
        )
      )
    )
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
