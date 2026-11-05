import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'
import { MOD } from './testUtils'

const LABEL = 'Page'

const text = (value: string) => ({ type: 'text', text: value })

function renderBlocks(
  props: Partial<React.ComponentProps<typeof Editor>> = {}
) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='blocks'
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const withUploads = {
  onUploadImage: async () => ({
    src: '/images/crowd.webp',
    alt: 'The crowd at sunset'
  })
}

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
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

const lastBlocks = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!

describe('Editor insert menu in the blocks preset', () => {
  it('opens on / with the preset’s blocks', async () => {
    renderBlocks(withUploads)
    await focusedTextbox()

    await userEvent.keyboard('/')

    expect(optionNames(await insertMenu())).toEqual([
      'Paragraph',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Bulleted list',
      'Numbered list',
      'Quote',
      'Image',
      'Embed',
      'Divider',
      'Table'
    ])
  })

  it('groups the blocks under headings, and hides a group with no matches', async () => {
    renderBlocks(withUploads)
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
          'Numbered list',
          'Quote'
        ]
      ],
      ['Media', ['Image', 'Embed']],
      ['Layout', ['Divider', 'Table']]
    ])
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() =>
      expect(textbox).toHaveAttribute(
        'aria-activedescendant',
        within(listbox).getByRole('option', { name: 'Table' }).id
      )
    )

    await userEvent.keyboard('ta')
    await waitFor(async () =>
      expect(groupNames(await insertMenu())).toEqual([['Layout', ['Table']]])
    )
  })

  it('leaves Image out without onUploadImage', async () => {
    renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/')

    expect(optionNames(await insertMenu())).not.toContain('Image')
  })

  it.each([
    ['youtube', ['Embed']],
    ['vimeo', ['Embed']],
    ['spotify', ['Embed']],
    ['soundcloud', ['Embed']],
    ['tiktok', ['Embed']],
    ['link', ['Embed']],
    ['h1', ['Heading 2']],
    ['h2', ['Heading 2']],
    ['h3', ['Heading 3']],
    ['h4', ['Heading 4']],
    ['title', ['Heading 2', 'Heading 3', 'Heading 4']],
    ['img', ['Image']],
    ['photo', ['Image']],
    ['ul', ['Bulleted list']],
    ['ol', ['Numbered list']],
    ['hr', ['Divider']],
    ['rule', ['Divider']],
    ['---', ['Divider']],
    ['>', ['Quote']]
  ])('finds /%s', async (query, names) => {
    renderBlocks(withUploads)
    await focusedTextbox()

    await userEvent.keyboard(`/${query}`)

    await waitFor(async () =>
      expect(optionNames(await insertMenu())).toEqual(names)
    )
  })

  it('keeps a No blocks match row open, so Enter inserts nothing', async () => {
    const onValueChange = renderBlocks()
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/hero')
    const listbox = await insertMenu()
    await waitFor(() =>
      expect(within(listbox).getByRole('option')).toHaveTextContent(
        'No blocks match'
      )
    )
    const row = within(listbox).getByRole('option')
    expect(row).toHaveAttribute('aria-disabled', 'true')
    expect(textbox).toHaveAttribute('aria-activedescendant', row.id)
    await userEvent.keyboard('{Enter}')

    expect(lastBlocks(onValueChange)).toMatchObject([
      { type: 'paragraph', content: [text('/hero')] }
    ])
    expect(lastBlocks(onValueChange)).toHaveLength(1)
    expect(screen.getByRole('listbox', { name: 'Insert' })).toBe(listbox)
  })

  it('closes once a space follows a query that matches nothing', async () => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/hero')
    await insertMenu()
    await userEvent.keyboard(' {Enter}')

    expect(screen.queryByRole('listbox')).toBe(null)
    await waitFor(() =>
      expect(lastBlocks(onValueChange)).toMatchObject([
        { type: 'paragraph', content: [text('/hero ')] },
        { type: 'paragraph' }
      ])
    )
  })

  it('breaks the line on Enter past a space, where nothing that fits is named', async () => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('- Doors /bulleted list')
    await insertMenu()
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ content: [text('Doors /bulleted list')] }]
          },
          { type: 'listItem' }
        ]
      })
    )
  })

  it.each([
    ['Heading 2', '## ', { type: 'heading', attrs: { level: 2 } }],
    ['Heading 3', '### ', { type: 'heading', attrs: { level: 3 } }],
    ['Heading 4', '#### ', { type: 'heading', attrs: { level: 4 } }],
    ['Bulleted list', '- ', { type: 'bulletList' }],
    ['Numbered list', '1. ', { type: 'orderedList' }],
    ['Quote', '> ', { type: 'blockquote' }],
    ['Divider', '---', { type: 'horizontalRule' }]
  ])('shows the shortcut that makes a %s', async (name, typed, block) => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/')
    const option = within(await insertMenu()).getByRole('option', { name })
    expect(
      option.querySelector('[data-slot="editor-insert-shortcut"]')
    ).toHaveTextContent(typed.trim())
    await userEvent.keyboard('{Escape}{Backspace}')
    await userEvent.keyboard(typed)

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject(block)
    )
  })

  it('shows no shortcuts without a fine pointer, as on a touch screen', async () => {
    const real = window.matchMedia.bind(window)
    const matchMedia = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((query) =>
        query === '(any-pointer: fine)'
          ? ({
              matches: false,
              media: query,
              addEventListener: () => {},
              removeEventListener: () => {}
            } as unknown as MediaQueryList)
          : real(query)
      )
    try {
      renderBlocks()
      await focusedTextbox()

      await userEvent.keyboard('/')
      const listbox = await insertMenu()

      expect(optionNames(listbox)).toContain('Heading 2')
      expect(
        listbox.querySelector('[data-slot="editor-insert-shortcut"]')
      ).toBe(null)
    } finally {
      matchMedia.mockRestore()
    }
  })

  it('inserts a block before a line with text when / starts it', async () => {
    const onValueChange = renderBlocks({
      defaultValue: {
        version: 1,
        preset: 'blocks',
        doc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [text('Doors 7pm')] }]
        }
      }
    })
    const textbox = await focusedTextbox()
    await userEvent.click(within(textbox).getByText('Doors 7pm'), {
      position: { x: 1, y: 4 }
    })

    await userEvent.keyboard('/divider{Enter}')

    await waitFor(() =>
      expect(lastBlocks(onValueChange)).toMatchObject([
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [text('Doors 7pm')] }
      ])
    )
  })

  it('shows no shortcut for a block without one', async () => {
    renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/')
    const listbox = await insertMenu()

    for (const name of ['Paragraph', 'Embed', 'Table']) {
      const option = within(listbox).getByRole('option', { name })
      expect(option.querySelector('[data-slot="editor-insert-shortcut"]')).toBe(
        null
      )
    }
  })

  it.each([
    ['Heading 2', { type: 'heading', attrs: { level: 2 } }],
    ['Bulleted list', { type: 'bulletList' }],
    ['Numbered list', { type: 'orderedList' }],
    ['Quote', { type: 'blockquote' }],
    ['Divider', { type: 'horizontalRule' }],
    ['Table', { type: 'table' }]
  ])('inserts a %s in place of the /', async (name, block) => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard(`/${name.toLowerCase()}`)
    await waitFor(async () =>
      expect(optionNames(await insertMenu())[0]).toBe(name)
    )
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject(block)
    )
    expect(JSON.stringify(lastBlocks(onValueChange))).not.toContain('/')
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it.each<[string, JSONContent]>([
    [
      'heading 3',
      { type: 'heading', attrs: { level: 3 }, content: [text('Lineup')] }
    ],
    [
      'quote',
      {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [text('Lineup')] }]
      }
    ]
  ])('puts the caret in a new %s', async (query, block) => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard(`/${query}{Enter}Lineup`)

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject(block)
    )
  })

  it('puts the caret in a new table’s first header cell', async () => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/table{Enter}Set time')

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [{ type: 'paragraph', content: [text('Set time')] }]
              },
              { type: 'tableHeader' },
              { type: 'tableHeader' }
            ]
          },
          { type: 'tableRow' },
          { type: 'tableRow' }
        ]
      })
    )
  })

  // An embed there would split the table around it.
  it('offers only Paragraph in a table cell', async () => {
    renderBlocks()
    await focusedTextbox()
    await userEvent.keyboard('/table{Enter}')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))

    await userEvent.keyboard('/')

    expect(optionNames(await insertMenu())).toEqual(['Paragraph'])
  })

  it.each([
    ['/quote', 'blockquote'],
    ['/table', 'table']
  ])('undoes %s back to what was typed', async (typed, type) => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard(`${typed}{Enter}`)
    await waitFor(() => expect(lastBlocks(onValueChange)[0]?.type).toBe(type))
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(lastBlocks(onValueChange)).toMatchObject([
        { type: 'paragraph', content: [text(typed)] }
      ])
    )
  })

  // A list item starts with a paragraph, so a block can't go before its
  // emptied first line.
  it('offers no table, divider, image or embed on a list item’s empty first line', async () => {
    renderBlocks(withUploads)
    await focusedTextbox()

    await userEvent.keyboard('- Doors{Enter}/')

    const names = optionNames(await insertMenu())
    expect(names).toContain('Numbered list')
    expect(names).not.toContain('Table')
    expect(names).not.toContain('Divider')
    expect(names).not.toContain('Image')
    expect(names).not.toContain('Embed')
  })

  // Each block's fit is checked against the line without the query, on a
  // transaction that must never reach the document.
  it('reports only what was typed while filtering', async () => {
    const onValueChange = renderBlocks(withUploads)
    await focusedTextbox()

    await userEvent.keyboard('/ta')
    await waitFor(async () =>
      expect(optionNames(await insertMenu())).toEqual(['Table'])
    )

    const reported = onValueChange.mock.calls.map(([value]) =>
      (value as EditorValue).doc.content!.map(({ type, content }) => [
        type,
        content?.map((node) => node.text).join('') ?? ''
      ])
    )
    expect(reported).toEqual(
      ['', '/', '/t', '/ta'].map((typed) => [['paragraph', typed]])
    )
  })

  it('inserts a table after a list item’s line with text', async () => {
    const onValueChange = renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('- Doors /table{Enter}')

    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [text('Doors ')] },
              { type: 'table' },
              { type: 'paragraph' }
            ]
          }
        ]
      })
    )
  })

  it('opens the Embed popover from Embed', async () => {
    renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/embed{Enter}')

    const field = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })
    // Focus moves into the popover's field after it renders.
    await waitFor(() => expect(field).toHaveFocus())
  })

  it('opens the file picker from Image, and puts the upload in place of the /', async () => {
    const onValueChange = renderBlocks(withUploads)
    const textbox = await focusedTextbox()
    const fileInput = screen.getByLabelText('Image file')
    const onPick = vi.fn()
    fileInput.addEventListener('click', (event) => {
      event.preventDefault()
      onPick()
    })

    await userEvent.keyboard('/image{Enter}')
    await waitFor(() => expect(onPick).toHaveBeenCalled())
    await userEvent.upload(
      fileInput,
      new File(['png'], 'crowd.png', { type: 'image/png' })
    )

    expect(
      await within(textbox).findByRole('img', { name: 'The crowd at sunset' })
    ).toBeVisible()
    await waitFor(() =>
      expect(lastBlocks(onValueChange)[0]).toMatchObject({ type: 'image' })
    )
    expect(textbox).not.toHaveTextContent('/')
  })
})
