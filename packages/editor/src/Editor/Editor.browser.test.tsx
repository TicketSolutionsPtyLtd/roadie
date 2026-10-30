import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
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

import { Field } from '@oztix/roadie-components/field'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import { Editor, useEditorContext } from '.'
import editorCss from '../css/editor.css?inline'
import {
  type EditorValue,
  type EmbedProvider,
  defaultEmbedProviders
} from '../schema'
import {
  LINE_END,
  LINE_START,
  MOD,
  clickIntoEditor,
  selectParagraph
} from './testUtils'

const LABEL = 'Event description'

const lineup: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ochre Kite Weekender at ' },
          {
            type: 'text',
            marks: [{ type: 'bold' }],
            text: 'Jumbuck Orchard Park'
          }
        ]
      }
    ]
  }
}

const soldOut: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Sold out' }] }
    ]
  }
}

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = editorCss
  document.head.append(style)
})
afterAll(() => style.remove())

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(textbox)
  expect(textbox).toHaveFocus()
  return textbox
}

// Firefox ignores the clipboardData a ClipboardEvent is made with and gives
// it an empty one, so the data is set on the event itself.
function dispatchPaste(target: HTMLElement, clipboardData: DataTransfer) {
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  target.dispatchEvent(event)
}

function paste(target: HTMLElement, data: Record<string, string>) {
  const clipboardData = new DataTransfer()
  for (const [type, text] of Object.entries(data)) {
    clipboardData.setData(type, text)
  }
  dispatchPaste(target, clipboardData)
}

function shortcut(...keys: string[]) {
  const held = [MOD, ...keys.slice(0, -1)]
  return userEvent.keyboard(
    `${held.map((key) => `{${key}>}`).join('')}${keys.at(-1)}${held
      .reverse()
      .map((key) => `{/${key}}`)
      .join('')}`
  )
}

function ControlledEditor() {
  const [value, setValue] = useState<EditorValue>(soldOut)
  return <Editor aria-label={LABEL} value={value} onValueChange={setValue} />
}

describe('Editor', () => {
  it('shows its defaultValue', async () => {
    render(<Editor aria-label={LABEL} defaultValue={lineup} />)

    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(textbox).toHaveAttribute('aria-multiline', 'true')
    expect(textbox).toHaveTextContent(
      'Ochre Kite Weekender at Jumbuck Orchard Park'
    )
    expect(within(textbox).getByText('Jumbuck Orchard Park').tagName).toBe(
      'STRONG'
    )
  })

  it('replaces its content when a controlled value changes', async () => {
    const { rerender } = render(<Editor aria-label={LABEL} value={lineup} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveTextContent('Ochre Kite'))

    rerender(<Editor aria-label={LABEL} value={soldOut} />)

    await waitFor(() => expect(textbox.textContent).toBe('Sold out'))
  })

  it('keeps the caret where it is while a controlled value echoes back', async () => {
    render(<ControlledEditor />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(
      `${LINE_END}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}`
    )

    await userEvent.keyboard('-ish')

    await waitFor(() => expect(textbox.textContent).toBe('Sold-ish out'))
  })

  it('reports each change as an EditorValue', async () => {
    const onValueChange = vi.fn()
    render(<Editor aria-label={LABEL} onValueChange={onValueChange} />)
    await focusedTextbox()

    await userEvent.keyboard('Doors 7pm')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith({
        version: 1,
        preset: 'basic',
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Doors 7pm' }]
            }
          ]
        }
      })
    )
  })

  it('bolds and italicises with Mod+B and Mod+I', async () => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()

    await shortcut('b')
    await userEvent.keyboard('Loud')
    await shortcut('b')
    await shortcut('i')
    await userEvent.keyboard('soft')

    await waitFor(() =>
      expect(within(textbox).getByText('Loud').tagName).toBe('STRONG')
    )
    expect(within(textbox).getByText('soft').tagName).toBe('EM')
  })

  it('underlines with Mod+U', async () => {
    const onValueChange = vi.fn()
    render(<Editor aria-label={LABEL} onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()

    await shortcut('u')
    await userEvent.keyboard('No refunds')

    await waitFor(() =>
      expect(within(textbox).getByText('No refunds').tagName).toBe('U')
    )
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'underline' }],
                  text: 'No refunds'
                }
              ]
            }
          ]
        }
      })
    )
  })

  it.each([
    ['bulleted', '8', 'UL'],
    ['numbered', '7', 'OL']
  ])('starts a %s list with Mod+Shift+%s', async (_kind, key, listTag) => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard('Doors 7pm')

    await shortcut('Shift', key)

    await waitFor(() =>
      expect(within(textbox).getByText('Doors 7pm').closest('li')).not.toBe(
        null
      )
    )
    expect(
      within(textbox).getByText('Doors 7pm').closest('li')?.parentElement
        ?.tagName
    ).toBe(listTag)
  })

  it('undoes typing with Mod+Z', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(`${LINE_END} tonight`)
    await waitFor(() => expect(textbox).toHaveTextContent('Sold out tonight'))

    await shortcut('z')

    await waitFor(() => expect(textbox.textContent).toBe('Sold out'))
  })

  it('keeps only paragraphs, lists, bold and italic from pasted HTML', async () => {
    const onValueChange = vi.fn()
    render(<Editor aria-label={LABEL} onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()

    paste(textbox, {
      'text/html': [
        '<h1>Lineup</h1>',
        '<script>window.pasted = true</script>',
        '<p style="color: red" onclick="window.pasted = true">Doors <b>7pm</b>',
        '<img src="/poster.png" alt="Poster"></p>',
        '<iframe src="https://www.youtube.com/embed/x"></iframe>',
        '<ul><li><i>All ages</i></li></ul>'
      ].join(''),
      'text/plain': 'Lineup Doors 7pm All ages'
    })

    await waitFor(() => expect(textbox).toHaveTextContent('All ages'))
    expect(
      textbox.querySelector('h1, script, iframe, img, [style], [onclick]')
    ).toBe(null)
    expect(within(textbox).getByText('Lineup').tagName).toBe('P')
    expect(within(textbox).getByText('7pm').tagName).toBe('STRONG')
    expect(within(textbox).getByText('All ages').closest('ul')).not.toBe(null)
    const { doc } = onValueChange.mock.lastCall![0] as EditorValue
    const types = new Set<string>()
    const visit = (node: EditorValue['doc']) => {
      types.add(node.type!)
      node.marks?.forEach((mark) => types.add(mark.type))
      node.content?.forEach(visit)
    }
    visit(doc)
    expect([...types].sort()).toEqual([
      'bold',
      'bulletList',
      'doc',
      'italic',
      'listItem',
      'paragraph',
      'text'
    ])
  })

  it('shows its placeholder while empty', async () => {
    render(
      <Editor aria-label={LABEL} placeholder='Tell people about the night' />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    await waitFor(() =>
      expect(
        getComputedStyle(textbox.firstElementChild!, '::before').content
      ).toBe('"Tell people about the night"')
    )
  })

  it('takes no typing when read-only', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={soldOut}
        onValueChange={onValueChange}
        readOnly
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(textbox).toHaveAttribute('aria-readonly', 'true')

    await userEvent.click(textbox)
    await userEvent.keyboard('Encore')

    expect(textbox.textContent).toBe('Sold out')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('gives custom children the editor through useEditorContext', async () => {
    function ClearButton() {
      const { editor } = useEditorContext()
      return (
        <button type='button' onClick={() => editor?.commands.clearContent()}>
          Clear
        </button>
      )
    }
    render(
      <Editor aria-label={LABEL} defaultValue={soldOut}>
        <ClearButton />
        <Editor.Content />
      </Editor>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    await waitFor(() => expect(textbox.textContent).toBe(''))
  })
})

function toolbarItems(toolbar: HTMLElement) {
  return Array.from(toolbar.children, (item) =>
    item.getAttribute('role') === 'separator'
      ? '|'
      : (item.getAttribute('aria-label') ?? item.textContent)
  )
}

async function formattingToolbar() {
  return screen.findByRole('toolbar', { name: 'Formatting' })
}

describe('Editor toolbar', () => {
  it('shows the basic preset controls in order, controlling the content', async () => {
    render(<Editor aria-label={LABEL} />)

    const toolbar = await formattingToolbar()
    const textbox = screen.getByRole('textbox', { name: LABEL })
    expect(toolbar).toHaveAttribute('aria-controls', textbox.id)
    expect(textbox.id).not.toBe('')
    expect(toolbarItems(toolbar)).toEqual([
      'Bold',
      'Italic',
      'Underline',
      'Link',
      '|',
      'Bulleted list',
      'Numbered list',
      '|',
      'Undo',
      'Redo'
    ])
  })

  it('shows Mod+U on the Underline control and its tooltip', async () => {
    render(<Editor aria-label={LABEL} />)
    await focusedTextbox()
    const underline = within(await formattingToolbar()).getByRole('button', {
      name: 'Underline'
    })
    expect(underline).toHaveAttribute('aria-keyshortcuts', `${MOD}+U`)

    await userEvent.hover(underline)

    const popup = await waitFor(() => {
      const shown = document.querySelector<HTMLElement>(
        '[data-slot="tooltip-popup"]'
      )
      expect(shown).toHaveTextContent('Underline')
      return shown!
    })
    expect(
      popup.querySelector('[data-slot="tooltip-shortcut"]')
    ).toHaveTextContent(MOD === 'Meta' ? 'U' : 'CtrlU')
  })

  it('presses Underline while the caret is in underlined text, and underlines with it', async () => {
    const noRefunds: EditorValue = {
      version: 1,
      preset: 'basic',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Tickets: ' },
              {
                type: 'text',
                marks: [{ type: 'underline' }],
                text: 'no refunds'
              }
            ]
          }
        ]
      }
    }
    render(<Editor aria-label={LABEL} defaultValue={noRefunds} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const underline = within(await formattingToolbar()).getByRole('button', {
      name: 'Underline'
    })
    expect(underline).toHaveAttribute('aria-pressed', 'false')

    await clickIntoEditor(within(textbox).getByText('no refunds'))
    await waitFor(() =>
      expect(underline).toHaveAttribute('aria-pressed', 'true')
    )

    await userEvent.keyboard(LINE_START)
    await waitFor(() =>
      expect(underline).toHaveAttribute('aria-pressed', 'false')
    )
    await userEvent.click(underline)
    await userEvent.keyboard('All')

    await waitFor(() =>
      expect(within(textbox).getByText('All').tagName).toBe('U')
    )
  })

  it('shows the shortcut in each control tooltip', async () => {
    render(<Editor aria-label={LABEL} />)
    await focusedTextbox()
    const toolbar = await formattingToolbar()
    const bold = within(toolbar).getByRole('button', { name: 'Bold' })
    expect(bold).toHaveAttribute('aria-keyshortcuts', `${MOD}+B`)

    await userEvent.hover(bold)

    const popup = await waitFor(() => {
      const shown = document.querySelector<HTMLElement>(
        '[data-slot="tooltip-popup"]'
      )
      expect(shown).toHaveTextContent('Bold')
      return shown!
    })
    expect(
      popup.querySelector('[data-slot="tooltip-shortcut"]')
    ).toHaveTextContent(MOD === 'Meta' ? 'B' : 'CtrlB')
  })

  it('presses Bold while the caret is in bold text', async () => {
    render(<Editor aria-label={LABEL} defaultValue={lineup} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const bold = within(await formattingToolbar()).getByRole('button', {
      name: 'Bold'
    })
    expect(bold).toHaveAttribute('aria-pressed', 'false')

    await clickIntoEditor(within(textbox).getByText('Jumbuck Orchard Park'))
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'))

    await userEvent.keyboard(LINE_START)
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'false'))
  })

  it('bolds what is typed next with the Bold control', async () => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()

    await userEvent.click(screen.getByRole('button', { name: 'Bold' }))
    await userEvent.keyboard('Loud')

    await waitFor(() =>
      expect(within(textbox).getByText('Loud').tagName).toBe('STRONG')
    )
  })

  it.each([
    ['Bulleted list', 'UL'],
    ['Numbered list', 'OL']
  ])('wraps and unwraps the block with %s', async (name, listTag) => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    const control = screen.getByRole('button', { name })

    await userEvent.click(control)

    await waitFor(() =>
      expect(
        within(textbox).getByText('Sold out').closest('li')?.parentElement
          ?.tagName
      ).toBe(listTag)
    )
    expect(control).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(control)

    await waitFor(() =>
      expect(within(textbox).getByText('Sold out').closest('li')).toBe(null)
    )
    expect(control).toHaveAttribute('aria-pressed', 'false')
  })

  it('enables Undo and Redo only when there is something to undo or redo', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    const undo = screen.getByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(undo).toHaveAttribute('aria-disabled', 'true')
    expect(redo).toHaveAttribute('aria-disabled', 'true')

    await userEvent.keyboard(`${LINE_END} tonight`)
    await waitFor(() => expect(undo).toHaveAttribute('aria-disabled', 'false'))

    await userEvent.click(undo)
    await waitFor(() => expect(textbox.textContent).toBe('Sold out'))
    expect(redo).toHaveAttribute('aria-disabled', 'false')
    expect(undo).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(redo)
    await waitFor(() => expect(textbox.textContent).toBe('Sold out tonight'))
  })

  it('moves focus to the toolbar with Alt+F10 and back to the caret with Escape', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(
      `${LINE_END}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}`
    )

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()

    // A disabled control stays in the arrow order.
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(textbox).toHaveFocus()
    await userEvent.keyboard('-ish')
    await waitFor(() => expect(textbox.textContent).toBe('Sold-ish out'))
  })

  it('puts custom children after the preset controls, with the editor from useEditorContext', async () => {
    function ClearControl() {
      const { editor } = useEditorContext()
      return (
        <Toolbar.Button
          onClick={() => editor?.chain().focus().clearContent(true).run()}
        >
          Clear
        </Toolbar.Button>
      )
    }
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={soldOut}
        onValueChange={onValueChange}
      >
        <Editor.Toolbar>
          <ClearControl />
        </Editor.Toolbar>
        <Editor.Content />
      </Editor>
    )
    await focusedTextbox()
    const toolbar = await formattingToolbar()
    expect(toolbarItems(toolbar).slice(-2)).toEqual(['Redo', 'Clear'])

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Clear' })
    )

    const textbox = screen.getByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox.textContent).toBe(''))
    expect(onValueChange).toHaveBeenCalled()
  })
})

const HELP = 'Shown on the event page'
const ERROR = 'Add a description'

function DescriptionField(props: {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}) {
  return (
    <Field {...props}>
      <Field.Label>{LABEL}</Field.Label>
      <Editor defaultValue={soldOut} />
      <Field.HelperText>{HELP}</Field.HelperText>
      <Field.ErrorText>{ERROR}</Field.ErrorText>
    </Field>
  )
}

const frameOf = (textbox: HTMLElement) =>
  textbox.closest<HTMLElement>('[data-slot="editor"]')!

describe('Editor in a Field', () => {
  it('is named by Field.Label and described by the helper text', async () => {
    render(<DescriptionField />)

    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(textbox).toHaveAccessibleDescription(HELP)
    expect(textbox).not.toHaveAttribute('aria-invalid')
    expect(textbox).not.toHaveAttribute('aria-required')
  })

  it('keeps its own aria-label over the Field label', async () => {
    render(
      <Field>
        <Field.Label>{LABEL}</Field.Label>
        <Editor aria-label='Lineup notes' />
      </Field>
    )

    expect(
      await screen.findByRole('textbox', { name: 'Lineup notes' })
    ).toBeInTheDocument()
  })

  it('reports invalid and is described by the error text while the Field is invalid', async () => {
    const { rerender } = render(<DescriptionField />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    rerender(<DescriptionField invalid />)

    await waitFor(() => expect(textbox).toHaveAccessibleDescription(ERROR))
    expect(textbox).toHaveAttribute('aria-invalid', 'true')
    expect(frameOf(textbox)).toHaveAttribute('aria-invalid', 'true')
  })

  it('reports required when the Field is', async () => {
    render(<DescriptionField required />)

    expect(await screen.findByRole('textbox', { name: LABEL })).toHaveAttribute(
      'aria-required',
      'true'
    )
  })

  it.each([
    ['the Field is disabled', <DescriptionField key='field' disabled />],
    [
      'disabled is set',
      <Editor key='prop' aria-label={LABEL} defaultValue={soldOut} disabled />
    ]
  ])('takes no typing and dims when %s', async (_, editor) => {
    render(editor)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(textbox).toHaveAttribute('aria-disabled', 'true')
    expect(frameOf(textbox)).toHaveAttribute('data-disabled')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )

    // Playwright waits for an aria-disabled target to enable unless forced.
    await userEvent.click(textbox, { force: true })
    await userEvent.keyboard('Encore')

    expect(textbox.textContent).toBe('Sold out')
  })

  it.each([
    ['disabled', { disabled: true }],
    ['read-only', { readOnly: true }]
  ])(
    'turns its controls off and on as it turns %s and back',
    async (_, props) => {
      const { rerender } = render(
        <Editor aria-label={LABEL} defaultValue={soldOut} />
      )
      await screen.findByRole('textbox', { name: LABEL })
      const bold = screen.getByRole('button', { name: 'Bold' })
      expect(bold).not.toHaveAttribute('aria-disabled', 'true')

      rerender(<Editor aria-label={LABEL} defaultValue={soldOut} {...props} />)
      await waitFor(() => expect(bold).toHaveAttribute('aria-disabled', 'true'))

      rerender(<Editor aria-label={LABEL} defaultValue={soldOut} />)
      await waitFor(() =>
        expect(bold).not.toHaveAttribute('aria-disabled', 'true')
      )
    }
  )

  it('submits its value as JSON in a native form', async () => {
    let submitted: FormData | undefined
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = new FormData(event.currentTarget)
        }}
      >
        <Editor aria-label={LABEL} name='description' defaultValue={soldOut} />
        <button type='submit'>Save</button>
      </form>
    )
    const textbox = await focusedTextbox()
    await userEvent.keyboard(`${LINE_END} tonight`)
    await waitFor(() => expect(textbox).toHaveTextContent('Sold out tonight'))

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(JSON.parse(submitted!.get('description') as string)).toEqual({
      version: 1,
      preset: 'basic',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Sold out tonight' }]
          }
        ]
      }
    })
  })

  it('leaves its value out of the form while disabled', async () => {
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
          name='description'
          defaultValue={soldOut}
          disabled
        />
        <button type='submit'>Save</button>
      </form>
    )
    await screen.findByRole('textbox', { name: LABEL })

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted!.has('description')).toBe(false)
  })
})

const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const withLink = (href: string): EditorValue => ({
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Get ' },
          {
            type: 'text',
            marks: [{ type: 'link', attrs: { href } }],
            text: 'tickets'
          }
        ]
      }
    ]
  }
})

function linksIn(value: EditorValue) {
  const hrefs: unknown[] = []
  const visit = (node: EditorValue['doc']) => {
    node.marks?.forEach((mark) => {
      if (mark.type === 'link') hrefs.push(mark.attrs)
    })
    node.content?.forEach(visit)
  }
  visit(value.doc)
  return hrefs
}

const soldOutThenDoors: EditorValue = {
  ...soldOut,
  doc: {
    type: 'doc',
    content: [
      ...soldOut.doc.content!,
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
}

async function selectSoldOut() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await selectParagraph(within(textbox).getByText('Sold out'))
  return textbox
}

describe('Editor links', () => {
  it('opens the link editor with Mod+K, and Escape returns to the selection', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(
      `${LINE_END}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}`
    )

    await shortcut('k')
    const url = await screen.findByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(url).toHaveFocus())

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Link' })).toBe(null)
    )
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard('-ish')
    await waitFor(() => expect(textbox.textContent).toBe('Sold-ish out'))
  })

  it('links the selection to a typed address, adding https://', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={soldOutThenDoors}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await selectParagraph(within(textbox).getByText('Sold out'))

    await userEvent.click(screen.getByRole('button', { name: 'Link' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Link' }),
      'www.oztix.com.au/ochre-kite-weekender{Enter}'
    )

    await waitFor(() =>
      expect(
        within(textbox).getByRole('link', { name: 'Sold out' })
      ).toHaveAttribute('href', TICKETS)
    )
    expect(linksIn(onValueChange.mock.lastCall![0])).toEqual([
      { href: TICKETS }
    ])
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Link' })).toBe(null)
    )
  })

  it('presses Link and edits the href while the caret is in a link', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={withLink('https://www.oztix.com.au')}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const link = screen.getByRole('button', { name: 'Link' })
    await userEvent.click(within(textbox).getByText('tickets'))
    await waitFor(() => expect(link).toHaveAttribute('aria-pressed', 'true'))

    await shortcut('k')
    const url = await screen.findByRole('textbox', { name: 'Link' })
    expect(url).toHaveValue('https://www.oztix.com.au')
    await userEvent.clear(url)
    await userEvent.type(url, TICKETS)
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }))

    await waitFor(() =>
      expect(
        within(textbox).getByRole('link', { name: 'tickets' })
      ).toHaveAttribute('href', TICKETS)
    )
  })

  it('removes the link at the caret', async () => {
    render(<Editor aria-label={LABEL} defaultValue={withLink(TICKETS)} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText('tickets'))

    await shortcut('k')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove link' })
    )

    await waitFor(() => expect(within(textbox).queryByRole('link')).toBe(null))
    expect(textbox).toHaveTextContent('Get tickets')
  })

  it('inserts the address as linked text when nothing is selected', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(`${LINE_END} `)

    await shortcut('k')
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Link' }),
      `${TICKETS}{Enter}`
    )

    await waitFor(() =>
      expect(
        within(textbox).getByRole('link', { name: TICKETS })
      ).toHaveAttribute('href', TICKETS)
    )
  })

  it.each([['javascript:alert(1)'], ['not a web address']])(
    'refuses %s with an error and keeps the editor open',
    async (typed) => {
      render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
      const textbox = await selectSoldOut()

      await shortcut('k')
      const url = await screen.findByRole('textbox', { name: 'Link' })
      await userEvent.type(url, typed)
      await userEvent.click(screen.getByRole('button', { name: 'Save link' }))

      await waitFor(() => expect(url).toHaveAttribute('aria-invalid', 'true'))
      expect(url).toHaveAccessibleDescription(/web address/)
      expect(within(textbox).queryByRole('link')).toBe(null)
    }
  )

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['a tab inside javascript:', 'java&#9;script:alert(1)']
  ])('pastes a link to %s as plain text', async (_, href) => {
    const onValueChange = vi.fn()
    render(<Editor aria-label={LABEL} onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()

    paste(textbox, {
      'text/html': `<p>Get <a href="${href}">tickets</a></p>`,
      'text/plain': 'Get tickets'
    })

    await waitFor(() => expect(textbox).toHaveTextContent('Get tickets'))
    expect(textbox.querySelector('a')).toBe(null)
    expect(linksIn(onValueChange.mock.lastCall![0])).toEqual([])
  })

  it('drops an unsafe href from a loaded value', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={withLink('javascript:alert(1)')}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    expect(textbox).toHaveTextContent('Get tickets')
    expect(textbox.querySelector('a')).toBe(null)

    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(linksIn(onValueChange.mock.lastCall![0])).toEqual([])
  })

  it('links an address as it is typed', async () => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard(`Tickets at ${TICKETS} today`)

    await waitFor(() =>
      expect(
        within(textbox).getByRole('link', { name: TICKETS })
      ).toHaveAttribute('href', TICKETS)
    )
  })
})

function RichEditor(props: { onValueChange?: (value: EditorValue) => void }) {
  return (
    <Editor
      aria-label={LABEL}
      preset='rich'
      defaultValue={{ ...soldOut, preset: 'rich' }}
      {...props}
    />
  )
}

function pasteHtml(target: HTMLElement, html: string, plain: string) {
  paste(target, { 'text/html': html, 'text/plain': plain })
}

describe('Editor rich preset', () => {
  it('leads with the block type, then the basic controls, Divider, Embed and Table', async () => {
    render(<RichEditor />)

    expect(toolbarItems(await formattingToolbar())).toEqual([
      'Block type: Paragraph',
      '|',
      'Bold',
      'Italic',
      'Underline',
      'Link',
      '|',
      'Bulleted list',
      'Numbered list',
      '|',
      'Divider',
      'Embed',
      'Table',
      '|',
      'Undo',
      'Redo'
    ])
  })

  // Typing straight after a click would otherwise land on the button.
  it.each(['Underline', 'Bulleted list', 'Divider'])(
    'gives focus back to the text in the same task as a %s click',
    async (name) => {
      render(<RichEditor />)
      const textbox = await focusedTextbox()
      const control = screen.getByRole('button', { name })

      control.focus()
      control.click()

      expect(textbox).toHaveFocus()
    }
  )

  it('underlines with the Underline control in the rich preset', async () => {
    const onValueChange = vi.fn()
    render(<RichEditor onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()
    const underline = screen.getByRole('button', { name: 'Underline' })

    await userEvent.keyboard(`${LINE_END} `)
    await userEvent.click(underline)
    await userEvent.keyboard('tonight')

    await waitFor(() =>
      expect(within(textbox).getByText('tonight').tagName).toBe('U')
    )
    expect(underline).toHaveAttribute('aria-pressed', 'true')
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ preset: 'rich' })
    )
  })

  it('changes the block from the Block type menu and names it on the trigger', async () => {
    const onValueChange = vi.fn()
    render(<RichEditor onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()
    const blockType = () => screen.getByRole('button', { name: /^Block type/ })
    const choose = async (name: string) => {
      await userEvent.click(blockType())
      await userEvent.click(await screen.findByRole('menuitemradio', { name }))
      await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    }

    await choose('Heading 3')

    await waitFor(() =>
      expect(within(textbox).getByText('Sold out').tagName).toBe('H3')
    )
    await waitFor(() => expect(textbox).toHaveFocus())
    expect(blockType()).toHaveAccessibleName('Block type: Heading 3')
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        preset: 'rich',
        doc: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Sold out' }]
            },
            // Tiptap keeps a paragraph last, so there's always a line to type on.
            { type: 'paragraph' }
          ]
        }
      })
    )

    await choose('Quote')
    expect(within(textbox).getByText('Sold out').tagName).toBe('P')
    expect(
      within(textbox).getByText('Sold out').closest('blockquote')
    ).not.toBe(null)
    expect(blockType()).toHaveAccessibleName('Block type: Quote')

    await userEvent.click(blockType())
    expect(
      await screen.findByRole('menuitemradio', { name: 'Quote' })
    ).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))

    await choose('Paragraph')
    expect(within(textbox).getByText('Sold out').closest('blockquote')).toBe(
      null
    )
    expect(blockType()).toHaveAccessibleName('Block type: Paragraph')
  })

  it.each([
    ['## ', 'H2'],
    ['### ', 'H3'],
    ['#### ', 'H4']
  ])('starts a heading with %j', async (typed, tag) => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard(`${typed}Lineup`)

    await waitFor(() =>
      expect(within(textbox).getByText('Lineup').tagName).toBe(tag)
    )
  })

  it('starts a quote with "> "', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard('> Best weekend of the year')

    await waitFor(() =>
      expect(
        within(textbox)
          .getByText('Best weekend of the year')
          .closest('blockquote')
      ).not.toBe(null)
    )
  })

  it('draws a divider with "---"', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard('---')

    await waitFor(() => expect(textbox.querySelector('hr')).not.toBe(null))
  })

  it('draws a divider with the Divider control', async () => {
    render(<RichEditor />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(LINE_END)

    await userEvent.click(screen.getByRole('button', { name: 'Divider' }))

    await waitFor(() => expect(textbox.querySelector('hr')).not.toBe(null))
  })

  it('reads a pasted h1 as a heading 2, and h5 and h6 as heading 4', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    pasteHtml(
      textbox,
      '<h1>Ochre Kite Weekender</h1><h5>Bar</h5><h6>Food</h6>',
      'Ochre Kite Weekender Bar Food'
    )

    await waitFor(() => expect(textbox).toHaveTextContent('Food'))
    expect(within(textbox).getByText('Ochre Kite Weekender').tagName).toBe('H2')
    expect(within(textbox).getByText('Bar').tagName).toBe('H4')
    expect(within(textbox).getByText('Food').tagName).toBe('H4')
  })
})

const CROWD = '/images/crowd.webp'
const CROWD_ALT = 'The crowd at sunset'

const pictured = (alt: string): EditorValue => ({
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      { type: 'image', attrs: { src: CROWD, alt } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Sold out' }] }
    ]
  }
})

function imageFile(name = 'crowd.png') {
  return new File(['png'], name, { type: 'image/png' })
}

function pasteFiles(target: HTMLElement, ...files: File[]) {
  const clipboardData = new DataTransfer()
  for (const file of files) clipboardData.items.add(file)
  dispatchPaste(target, clipboardData)
}

function dropFiles(target: HTMLElement, ...files: File[]) {
  const dataTransfer = new DataTransfer()
  for (const file of files) dataTransfer.items.add(file)
  const box = target.getBoundingClientRect()
  const drop = new DragEvent('drop', {
    dataTransfer,
    bubbles: true,
    cancelable: true,
    clientX: box.left + 8,
    clientY: box.top + 8
  })
  target.dispatchEvent(drop)
  return drop
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

function imagesIn(value: EditorValue) {
  return (value.doc.content ?? [])
    .filter((node) => node.type === 'image')
    .map((node) => node.attrs)
}

describe('Editor images', () => {
  it('has no image control, and ignores pasted and dropped images, without onUploadImage', async () => {
    const onValueChange = vi.fn()
    render(<RichEditor onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()
    expect(screen.queryByRole('button', { name: 'Image' })).toBe(null)

    pasteFiles(textbox, imageFile())
    const drop = dropFiles(textbox, imageFile())
    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(textbox).toHaveTextContent('Sold out!'))
    expect(drop.defaultPrevented).toBe(true)
    expect(textbox.querySelector('img')).toBe(null)
    expect(imagesIn(onValueChange.mock.lastCall![0])).toEqual([])
  })

  it('ignores onUploadImage in the basic preset, which holds no images', async () => {
    const onUploadImage = vi.fn(async () => ({ src: CROWD }))
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={soldOut}
        onUploadImage={onUploadImage}
      />
    )
    const textbox = await focusedTextbox()
    expect(screen.queryByRole('button', { name: 'Image' })).toBe(null)

    pasteFiles(textbox, imageFile())
    dropFiles(textbox, imageFile())
    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(textbox).toHaveTextContent('Sold out!'))
    expect(onUploadImage).not.toHaveBeenCalled()
  })

  it('uploads a chosen image, showing a placeholder until it is saved', async () => {
    const upload = deferred<{ src: string; alt?: string }>()
    const onUploadImage = vi.fn(() => upload.promise)
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='rich'
        defaultValue={{ ...soldOut, preset: 'rich' }}
        onUploadImage={onUploadImage}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    const file = imageFile()

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))
    await userEvent.upload(screen.getByLabelText('Image file'), file)

    expect(onUploadImage).toHaveBeenCalledWith(file)
    expect(
      await within(textbox).findByRole('status', { name: 'Uploading image' })
    ).toBeVisible()

    upload.resolve({ src: CROWD, alt: CROWD_ALT })

    const image = await within(textbox).findByRole('img', { name: CROWD_ALT })
    expect(image).toHaveAttribute('src', CROWD)
    expect(within(textbox).queryByRole('status')).toBe(null)
    expect(imagesIn(onValueChange.mock.lastCall![0])).toEqual([
      { src: CROWD, alt: CROWD_ALT }
    ])
  })

  it.each([
    ['pasted', pasteFiles],
    ['dropped', dropFiles]
  ])('uploads a %s image file', async (_, send) => {
    const onUploadImage = vi.fn(async () => ({ src: CROWD }))
    render(
      <Editor
        aria-label={LABEL}
        preset='rich'
        defaultValue={{ ...soldOut, preset: 'rich' }}
        onUploadImage={onUploadImage}
      />
    )
    const textbox = await focusedTextbox()
    const file = imageFile()

    send(textbox, file, new File(['x'], 'notes.txt', { type: 'text/plain' }))

    const image = await waitFor(() => {
      const shown = textbox.querySelector('img')
      expect(shown).toHaveAttribute('src', CROWD)
      return shown!
    })
    expect(image).toHaveAttribute('alt', '')
    expect(onUploadImage).toHaveBeenCalledTimes(1)
    expect(onUploadImage).toHaveBeenCalledWith(file)
  })

  it.each<[string, () => Promise<{ src: string }>, RegExp]>([
    [
      'rejects',
      () => Promise.reject(new Error('That file is over 5 MB.')),
      /^That file is over 5 MB\.$/
    ],
    [
      'throws before returning a promise',
      () => {
        throw new Error('That file is over 5 MB.')
      },
      /^That file is over 5 MB\.$/
    ],
    [
      'returns an http: address',
      async () => ({ src: 'http://example.com/a.png' }),
      /couldn’t be added/
    ]
  ])(
    'shows an error in the Field when the upload %s',
    async (_, onUploadImage, message) => {
      render(
        <Field>
          <Field.Label>{LABEL}</Field.Label>
          <Editor
            preset='rich'
            defaultValue={{ ...soldOut, preset: 'rich' }}
            onUploadImage={onUploadImage}
          />
          <Field.ErrorText />
        </Field>
      )
      const textbox = await focusedTextbox()

      pasteFiles(textbox, imageFile())

      expect((await screen.findByRole('alert')).textContent).toMatch(message)
      expect(within(textbox).queryByRole('status')).toBe(null)
      expect(textbox.querySelector('img')).toBe(null)
    }
  )

  it('shows an upload error under the editor outside a Field, until the next upload', async () => {
    const onUploadImage = vi
      .fn<(file: File) => Promise<{ src: string }>>()
      .mockRejectedValueOnce(new Error('That file is over 5 MB.'))
      .mockResolvedValueOnce({ src: CROWD })
    render(
      <Editor
        aria-label={LABEL}
        preset='rich'
        defaultValue={{ ...soldOut, preset: 'rich' }}
        onUploadImage={onUploadImage}
      />
    )
    const textbox = await focusedTextbox()

    pasteFiles(textbox, imageFile())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That file is over 5 MB.'
    )

    pasteFiles(textbox, imageFile())
    await waitFor(() => expect(textbox.querySelector('img')).not.toBe(null))
    expect(screen.queryByRole('alert')).toBe(null)
  })

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['http:', 'http://example.com/a.png'],
    ['another site by a protocol-relative URL', '//evil.test/a.png']
  ])('drops a pasted image on %s', async (_, src) => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    pasteHtml(textbox, `<p>Doors</p><img src="${src}" alt="Poster">`, 'Doors')

    await waitFor(() => expect(textbox).toHaveTextContent('Doors'))
    expect(textbox.querySelector('img')).toBe(null)
  })

  it('keeps a pasted https image, with its alt text', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    pasteHtml(
      textbox,
      `<img src="https://assets.example.com/crowd.webp" alt="${CROWD_ALT}">`,
      ''
    )

    expect(
      await within(textbox).findByRole('img', { name: CROWD_ALT })
    ).toHaveAttribute('src', 'https://assets.example.com/crowd.webp')
  })

  it('flags an image with no alt text until it is added', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='rich'
        defaultValue={pictured('')}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(await within(textbox).findByText('No alt text')).toBeVisible()

    await clickIntoEditor(within(textbox).getByText('Sold out'))
    await userEvent.keyboard(`${LINE_START}{ArrowUp}{Enter}`)
    const field = await screen.findByRole('textbox', { name: 'Alt text' })
    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.type(field, `${CROWD_ALT}{Enter}`)

    expect(
      await within(textbox).findByRole('img', { name: CROWD_ALT })
    ).toBeVisible()
    expect(within(textbox).queryByText('No alt text')).toBe(null)
    expect(imagesIn(onValueChange.mock.lastCall![0])).toEqual([
      { src: CROWD, alt: CROWD_ALT }
    ])
  })

  it('opens the alt text editor with Enter on a selected image', async () => {
    render(
      <Editor
        aria-label={LABEL}
        preset='rich'
        defaultValue={pictured(CROWD_ALT)}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(within(textbox).queryByText('No alt text')).toBe(null)

    await clickIntoEditor(within(textbox).getByText('Sold out'))
    await userEvent.keyboard(`${LINE_START}{ArrowUp}{Enter}`)

    expect(
      await screen.findByRole('textbox', { name: 'Alt text' })
    ).toHaveValue(CROWD_ALT)
  })
})

// Players point at this server, so the tests load nothing from the internet.
const localPlayers: EmbedProvider[] = defaultEmbedProviders.map((provider) => ({
  ...provider,
  src: ({ id }) => `/embed-test/${provider.name}/${id}`
}))

const YOUTUBE = 'https://www.youtube.com/watch?v=exampleVid1'

function EmbedEditor(props: {
  defaultValue?: EditorValue
  onValueChange?: (value: EditorValue) => void
  resolveUrl?: (url: string) => Promise<string>
  embedProviders?: readonly EmbedProvider[]
}) {
  return (
    <Editor
      aria-label={LABEL}
      preset='rich'
      embedProviders={localPlayers}
      {...props}
    />
  )
}

function pasteText(target: HTMLElement, value: string) {
  paste(target, { 'text/plain': value })
}

function embedsIn(value: EditorValue) {
  return (value.doc.content ?? [])
    .filter((node) => node.type === 'embed')
    .map((node) => node.attrs)
}

const embedded = (attrs: Record<string, unknown>): EditorValue => ({
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      { type: 'embed', attrs },
      { type: 'paragraph', content: [{ type: 'text', text: 'Sold out' }] }
    ]
  }
})

describe('Editor embeds', () => {
  it('embeds a supported URL pasted alone on an empty line, saving no src', async () => {
    const onValueChange = vi.fn()
    render(<EmbedEditor onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()

    pasteText(textbox, YOUTUBE)

    const player = await within(textbox).findByTitle(
      'YouTube embed exampleVid1'
    )
    expect(player.tagName).toBe('IFRAME')
    expect(player).toHaveAttribute('src', '/embed-test/youtube/exampleVid1')
    expect(player).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation'
    )
    expect(player).toHaveAttribute(
      'allow',
      'encrypted-media; fullscreen; picture-in-picture'
    )
    expect(player).toHaveAttribute('loading', 'lazy')
    expect(embedsIn(onValueChange.mock.lastCall![0])).toEqual([
      { provider: 'youtube', id: 'exampleVid1', params: null }
    ])
  })

  it('links a supported URL pasted into a sentence', async () => {
    render(<EmbedEditor defaultValue={{ ...soldOut, preset: 'rich' }} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(`${LINE_END} `)

    pasteText(textbox, YOUTUBE)

    expect(
      await within(textbox).findByRole('link', { name: YOUTUBE })
    ).toBeVisible()
    expect(textbox.querySelector('iframe')).toBe(null)
  })

  it.each([
    [
      'a look-alike suffix',
      'https://youtube.com.evil.test/watch?v=exampleVid1'
    ],
    ['a look-alike prefix', 'https://evilyoutube.com/watch?v=exampleVid1'],
    ['user info', 'https://youtube.com@evil.test/watch?v=exampleVid1']
  ])('pastes a URL with %s as text, not an embed', async (_, url) => {
    render(<EmbedEditor />)
    const textbox = await focusedTextbox()

    pasteText(textbox, url)

    await waitFor(() => expect(textbox).toHaveTextContent(url))
    expect(textbox.querySelector('iframe')).toBe(null)
  })

  it('embeds a URL from the Embed control', async () => {
    render(<EmbedEditor />)
    const textbox = await focusedTextbox()

    await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Video or audio link' }),
      'https://vimeo.com/76979871/8272103f6e{Enter}'
    )

    expect(
      await within(textbox).findByTitle('Vimeo embed 76979871')
    ).toHaveAttribute('src', '/embed-test/vimeo/76979871')
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Video or audio link' })
      ).toBe(null)
    )
  })

  it('refuses a URL no provider takes, with an error, in the Embed control', async () => {
    render(<EmbedEditor />)
    const textbox = await focusedTextbox()

    await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
    const field = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })
    await userEvent.type(
      field,
      'https://www.instagram.com/p/C1a2b3c4d5e/{Enter}'
    )

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(/can’t be embedded/)
    expect(textbox.querySelector('iframe')).toBe(null)
  })

  it('resolves a short link through resolveUrl', async () => {
    const resolveUrl = vi.fn(
      async () => 'https://www.tiktok.com/@oztix/video/7000000000000000001'
    )
    render(<EmbedEditor resolveUrl={resolveUrl} />)
    const textbox = await focusedTextbox()

    await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Video or audio link' }),
      'https://vm.tiktok.com/ZMabcdef/{Enter}'
    )

    expect(
      await within(textbox).findByTitle('TikTok embed 7000000000000000001')
    ).toBeVisible()
    expect(resolveUrl).toHaveBeenCalledWith('https://vm.tiktok.com/ZMabcdef/')
  })

  it('embeds nothing when the Embed control closes before resolveUrl settles', async () => {
    const { promise, resolve } = Promise.withResolvers<string>()
    render(<EmbedEditor resolveUrl={() => promise} />)
    const textbox = await focusedTextbox()
    await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
    const field = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })
    await userEvent.type(field, 'https://vm.tiktok.com/ZMabcdef/{Enter}')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(field).not.toBeInTheDocument())

    resolve('https://www.tiktok.com/@oztix/video/7000000000000000001')
    await promise
    await new Promise(requestAnimationFrame)

    expect(textbox.querySelector('iframe')).toBe(null)
  })

  it.each<[string, Record<string, unknown>, (box: DOMRect) => void]>([
    [
      'Spotify at its fixed height',
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      },
      (box) => expect(box.height).toBe(352)
    ],
    [
      'TikTok at 9:16',
      { provider: 'tiktok', id: '7000000000000000001', params: null },
      (box) => expect(box.width / box.height).toBeCloseTo(9 / 16, 2)
    ],
    [
      'YouTube at 16:9',
      { provider: 'youtube', id: 'exampleVid1', params: null },
      (box) => expect(box.width / box.height).toBeCloseTo(16 / 9, 2)
    ]
  ])('shows %s', async (_, attrs, check) => {
    render(<EmbedEditor defaultValue={embedded(attrs)} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    const player = await waitFor(() => {
      const shown = textbox.querySelector('iframe')
      expect(shown).not.toBe(null)
      return shown!
    })

    check(player.getBoundingClientRect())
  })

  it('selects an embed on click rather than playing it, and deletes it with Backspace', async () => {
    const onValueChange = vi.fn()
    render(
      <EmbedEditor
        defaultValue={embedded({
          provider: 'youtube',
          id: 'exampleVid1',
          params: null
        })}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const player = await within(textbox).findByTitle(
      'YouTube embed exampleVid1'
    )
    const box = player.getBoundingClientRect()
    expect(
      document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2
      )
    ).not.toBe(player)

    await userEvent.click(player, { force: true })
    await userEvent.keyboard('{Backspace}')

    await waitFor(() => expect(textbox.querySelector('iframe')).toBe(null))
    expect(textbox).toHaveTextContent('Sold out')
    expect(embedsIn(onValueChange.mock.lastCall![0])).toEqual([])
  })

  it('selects an embed with the arrow keys and deletes it', async () => {
    render(
      <EmbedEditor
        defaultValue={embedded({
          provider: 'youtube',
          id: 'exampleVid1',
          params: null
        })}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await within(textbox).findByTitle('YouTube embed exampleVid1')
    await clickIntoEditor(within(textbox).getByText('Sold out'))

    await userEvent.keyboard(`${LINE_START}{ArrowUp}{Delete}`)

    await waitFor(() => expect(textbox.querySelector('iframe')).toBe(null))
    expect(textbox).toHaveTextContent('Sold out')
  })

  it('shows a saved embed only from a provider it was given', async () => {
    const loom: EmbedProvider = {
      name: 'loom',
      label: 'Loom',
      id: /^[0-9a-f]{32}$/,
      aspect: '16:9',
      match: () => null,
      src: ({ id }) => `/embed-test/loom/${id}`
    }
    const id = '0123456789abcdef0123456789abcdef'
    const value = embedded({ provider: 'loom', id, params: null })
    const { unmount } = render(<EmbedEditor defaultValue={value} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(
      await within(textbox).findByText('This embed can’t be shown.')
    ).toBeVisible()
    expect(textbox.querySelector('iframe')).toBe(null)
    unmount()

    render(
      <EmbedEditor
        defaultValue={value}
        embedProviders={[...localPlayers, loom]}
      />
    )

    expect(await screen.findByTitle(`Loom embed ${id}`)).toHaveAttribute(
      'src',
      `/embed-test/loom/${id}`
    )
  })
})

const richLineup: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Lineup' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Ochre Kite Weekender' }]
      }
    ]
  }
}

function lastSavedText(onValueChange: ReturnType<typeof vi.fn>) {
  const saved = onValueChange.mock.lastCall![0] as EditorValue
  return JSON.stringify(saved.doc)
}

describe('Editor and a stored value’s preset', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('takes its preset from its value, keeping the content as it edits', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={richLineup}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    expect(
      within(textbox).getByRole('heading', { level: 2 })
    ).toHaveTextContent('Lineup')

    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    const saved = onValueChange.mock.lastCall![0] as EditorValue
    expect(saved.preset).toBe('rich')
    expect(saved.doc.content?.[0]?.type).toBe('heading')
    expect(lastSavedText(onValueChange)).toContain('Ochre Kite Weekender')
  })

  it('keeps the text of a value its preset prop holds less of, with a warning', async () => {
    // A browser has no `process`; a consumer's bundler supplies NODE_ENV.
    vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='basic'
        defaultValue={richLineup}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    expect(textbox).toHaveTextContent('LineupOchre Kite Weekender')
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"rich".*"basic"/))
    warn.mockRestore()

    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(onValueChange.mock.lastCall![0].preset).toBe('basic')
    expect(lastSavedText(onValueChange)).toContain('Lineup')
  })

  it('shows a controlled value that moves to another preset', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <Editor
        aria-label={LABEL}
        value={soldOut}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()

    rerender(
      <Editor
        aria-label={LABEL}
        value={richLineup}
        onValueChange={onValueChange}
      />
    )

    const heading = await within(
      await screen.findByRole('textbox', { name: LABEL })
    ).findByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Lineup')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps text whose marks its preset doesn’t hold', async () => {
    const onValueChange = vi.fn()
    const struck: EditorValue = {
      ...soldOut,
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'strike' }], text: 'Sold out' }
            ]
          }
        ]
      }
    }
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={struck}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    expect(textbox).toHaveTextContent('Sold out')

    await userEvent.keyboard(`${LINE_END}!`)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(lastSavedText(onValueChange)).toContain('Sold out!')
  })
})
