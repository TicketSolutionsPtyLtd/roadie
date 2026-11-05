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

const insertMenu = () => screen.findByRole('listbox', { name: 'Insert' })

const optionNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent)

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
