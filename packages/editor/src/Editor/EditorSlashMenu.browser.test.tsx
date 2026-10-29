import { render, screen, waitFor, within } from '@testing-library/react'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor, useEditorContext } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { MOD } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const text = (value: string) => ({ type: 'text', text: value })

const valueOf = (preset: EditorValue['preset'], ...content: object[]) => ({
  version: 1,
  preset,
  doc: { type: 'doc', content: content as JSONContent[] }
})

const blocks = (onValueChange = vi.fn()) => (
  <Editor
    aria-label={LABEL}
    preset='blocks'
    onValueChange={onValueChange}
    onUploadImage={async () => ({
      src: '/images/crowd.webp',
      alt: 'The crowd at sunset'
    })}
  />
)

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

const listbox = () => screen.findByRole('listbox', { name: 'Blocks' })
const optionNames = async () =>
  within(await listbox())
    .queryAllByRole('option')
    .map((option) => option.textContent)

function activeOption(textbox: HTMLElement) {
  const id = textbox.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent : null
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc

describe('Editor.SlashMenu', () => {
  it('opens a listbox of the preset’s blocks on / in an empty paragraph', async () => {
    render(blocks())
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')

    expect(await optionNames()).toEqual([
      'Text',
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
    expect(textbox).toHaveAttribute('aria-controls', (await listbox()).id)
    expect(activeOption(textbox)).toBe('Text')
    expect(textbox).toHaveFocus()
  })

  it('lays each block’s icon beside its name, and opens below the /', async () => {
    render(blocks())
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    const list = await listbox()
    const option = within(list).getByRole('option', {
      name: 'Heading 2'
    })
    const icon = option.querySelector('svg')!.getBoundingClientRect()
    const row = option.getBoundingClientRect()
    const line = textbox.querySelector('p')!.getBoundingClientRect()

    await waitFor(() =>
      expect(list.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        line.bottom
      )
    )
    expect(icon.top).toBeGreaterThan(row.top)
    expect(icon.bottom).toBeLessThan(row.bottom)
    expect(icon.right).toBeLessThan(
      within(option).getByText('Heading 2').getBoundingClientRect().left
    )
  })

  it('leaves Image out without onUploadImage', async () => {
    render(<Editor aria-label={LABEL} preset='blocks' />)
    await focusedTextbox()

    await userEvent.keyboard('/')

    expect(await optionNames()).not.toContain('Image')
  })

  it('filters the blocks by what follows the /', async () => {
    render(blocks())
    await focusedTextbox()

    await userEvent.keyboard('/head')

    await waitFor(async () =>
      expect(await optionNames()).toEqual([
        'Heading 2',
        'Heading 3',
        'Heading 4'
      ])
    )
  })

  it('says so when no block matches, and Enter then breaks the line', async () => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    await focusedTextbox()

    await userEvent.keyboard('/zzz')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No matching blocks'
    )
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(lastDoc(onValueChange).content).toHaveLength(2))
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it.each<[string, EditorValue['preset'], object[]]>([
    [
      'after text',
      'blocks',
      [{ type: 'paragraph', content: [text('Doors ')] }]
    ],
    ['in the rich preset', 'rich', []],
    [
      'in a list item',
      'blocks',
      [
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
        }
      ]
    ]
  ])('opens nothing on / %s', async (_, preset, content) => {
    render(
      <Editor aria-label={LABEL} defaultValue={valueOf(preset, ...content)} />
    )
    const textbox = await focusedTextbox()
    await userEvent.click(textbox.querySelector('p')!)

    await userEvent.keyboard('/')

    await waitFor(() => expect(textbox).toHaveTextContent('/'))
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('opens on a / typed before the editor has read where the click put the caret', async () => {
    let editor: TiptapEditor | null = null
    function Capture() {
      editor = useEditorContext().editor
      return null
    }
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(
          'blocks',
          { type: 'paragraph', content: [text('Doors 7pm')] },
          { type: 'paragraph' }
        )}
      >
        <Editor.Content />
        <Editor.SlashMenu />
        <Capture />
      </Editor>
    )
    await focusedTextbox()
    await waitFor(() => expect(editor).not.toBe(null))
    const view = editor!.view
    // The state still holds the caret in the first paragraph, while the
    // browser types into the empty one after it.
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1))
    )
    const empty = view.state.doc.child(0).nodeSize + 1
    view.someProp('handleTextInput', (handle) =>
      handle(view, empty, empty, '/', () =>
        view.state.tr.insertText('/', empty)
      )
    )

    expect(await listbox()).toBeVisible()
  })

  it('moves through the blocks with the arrow keys, wrapping at each end', async () => {
    render(blocks())
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    await listbox()
    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption(textbox)).toBe('Heading 2')
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    expect(activeOption(textbox)).toBe('Table')
    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption(textbox)).toBe('Text')
    expect(
      within(await listbox()).getByRole('option', { name: 'Text' })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('closes on Escape, leaving the /, and stays closed as typing goes on', async () => {
    render(blocks())
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    await listbox()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    await userEvent.keyboard('x')

    expect(textbox).toHaveTextContent('/x')
    expect(screen.queryByRole('listbox')).toBe(null)
    expect(textbox).not.toHaveAttribute('aria-activedescendant')
    expect(textbox).toHaveFocus()
  })

  it('closes when the caret moves before the /', async () => {
    render(blocks())
    await focusedTextbox()

    await userEvent.keyboard('/')
    await listbox()
    await userEvent.keyboard('{ArrowLeft}')

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
  })

  it('closes when focus leaves the editor', async () => {
    render(blocks())
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    await listbox()
    textbox.blur()

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(textbox).not.toHaveAttribute('aria-controls')
  })

  it('leaves Shift+Enter to break the line, inserting nothing', async () => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    await focusedTextbox()

    await userEvent.keyboard('/quote{Shift>}{Enter}{/Shift}')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]).toMatchObject({
        type: 'paragraph',
        content: [text('/quote'), { type: 'hardBreak' }]
      })
    )
  })

  it.each([
    ['Text', 'paragraph'],
    ['Heading 2', 'heading'],
    ['Heading 4', 'heading'],
    ['Bulleted list', 'bulletList'],
    ['Numbered list', 'orderedList'],
    ['Quote', 'blockquote'],
    ['Divider', 'horizontalRule'],
    ['Table', 'table']
  ])('inserts a %s with Enter, in place of the /', async (label, type) => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    await focusedTextbox()

    await userEvent.keyboard(`/${label.toLowerCase()}`)
    await waitFor(async () => expect((await optionNames())[0]).toBe(label))
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]!.type).toBe(type)
    )
    expect(JSON.stringify(lastDoc(onValueChange))).not.toContain('/')
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('inserts the heading level chosen, and typing fills it', async () => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    await focusedTextbox()

    await userEvent.keyboard('/heading 3{Enter}Lineup')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]).toMatchObject({
        type: 'heading',
        attrs: { level: 3 },
        content: [text('Lineup')]
      })
    )
  })

  it('inserts a block on a tap or click, keeping focus in the text', async () => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/')
    await userEvent.click(
      within(await listbox()).getByRole('option', { name: 'Quote' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]!.type).toBe('blockquote')
    )
    expect(textbox).toHaveFocus()
  })

  it('undoes an inserted block back to the typed /', async () => {
    const onValueChange = vi.fn()
    render(blocks(onValueChange))
    await focusedTextbox()

    await userEvent.keyboard('/quote{Enter}')
    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]!.type).toBe('blockquote')
    )
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]).toMatchObject({
        type: 'paragraph',
        content: [text('/quote')]
      })
    )
  })

  it('opens the Embed popover from Embed', async () => {
    render(blocks())
    await focusedTextbox()

    await userEvent.keyboard('/embed{Enter}')

    expect(
      await screen.findByRole('textbox', { name: 'Video or audio link' })
    ).toHaveFocus()
  })

  it('opens the file picker from Image, and puts the upload in place of the /', async () => {
    const onValueChange = vi.fn()
    const click = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(blocks(onValueChange))
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/image{Enter}')
    await waitFor(() => expect(click).toHaveBeenCalled())
    click.mockRestore()
    await userEvent.upload(
      screen.getByLabelText('Image file'),
      new File(['png'], 'crowd.png', { type: 'image/png' })
    )

    expect(
      await within(textbox).findByRole('img', { name: 'The crowd at sunset' })
    ).toBeVisible()
    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]!.type).toBe('image')
    )
    expect(textbox).not.toHaveTextContent('/')
  })

  it('renders in custom children only where Editor.SlashMenu is placed', async () => {
    const { unmount } = render(
      <Editor aria-label={LABEL} preset='blocks'>
        <Editor.Content />
      </Editor>
    )
    const bare = await focusedTextbox()
    await userEvent.keyboard('/')
    await waitFor(() => expect(bare).toHaveTextContent('/'))
    expect(screen.queryByRole('listbox')).toBe(null)
    unmount()

    render(
      <Editor aria-label={LABEL} preset='blocks'>
        <Editor.Content />
        <Editor.SlashMenu />
      </Editor>
    )
    await focusedTextbox()
    await userEvent.keyboard('/')

    expect(await listbox()).toBeVisible()
  })
})
