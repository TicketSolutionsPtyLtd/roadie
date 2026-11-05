import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'

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
      'Divider',
      'Image',
      'Embed',
      'Table'
    ])
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

  it('offers no table, heading or list in a table cell', async () => {
    renderBlocks()
    await focusedTextbox()
    await userEvent.keyboard('/table{Enter}')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))

    await userEvent.keyboard('/')

    const names = optionNames(await insertMenu())
    expect(names).not.toContain('Table')
    expect(names).not.toContain('Heading 2')
    expect(names).not.toContain('Bulleted list')
  })

  it('opens the Embed popover from Embed', async () => {
    renderBlocks()
    await focusedTextbox()

    await userEvent.keyboard('/embed{Enter}')

    expect(
      await screen.findByRole('textbox', { name: 'Video or audio link' })
    ).toHaveFocus()
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
