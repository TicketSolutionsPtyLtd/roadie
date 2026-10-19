import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Field } from '@oztix/roadie-components/field'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import { Editor, useEditorContext } from '.'
import editorCss from '../css/editor.css?inline'
import type { EditorValue } from '../schema'

const MOD = /^(Mac|iP)/.test(navigator.platform) ? 'Meta' : 'Control'

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
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
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
      '{End}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}'
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
    await userEvent.keyboard('{End} tonight')
    await waitFor(() => expect(textbox).toHaveTextContent('Sold out tonight'))

    await shortcut('z')

    await waitFor(() => expect(textbox.textContent).toBe('Sold out'))
  })

  it('keeps only paragraphs, lists, bold and italic from pasted HTML', async () => {
    const onValueChange = vi.fn()
    render(<Editor aria-label={LABEL} onValueChange={onValueChange} />)
    const textbox = await focusedTextbox()
    const clipboardData = new DataTransfer()
    clipboardData.setData(
      'text/html',
      [
        '<h1>Lineup</h1>',
        '<script>window.pasted = true</script>',
        '<p style="color: red" onclick="window.pasted = true">Doors <b>7pm</b>',
        '<img src="/poster.png" alt="Poster"></p>',
        '<iframe src="https://www.youtube.com/embed/x"></iframe>',
        '<ul><li><i>All ages</i></li></ul>'
      ].join('')
    )
    clipboardData.setData('text/plain', 'Lineup Doors 7pm All ages')

    textbox.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      })
    )

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

    await userEvent.click(within(textbox).getByText('no refunds'))
    await waitFor(() =>
      expect(underline).toHaveAttribute('aria-pressed', 'true')
    )

    await userEvent.keyboard('{Home}')
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

    await userEvent.click(within(textbox).getByText('Jumbuck Orchard Park'))
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'))

    await userEvent.keyboard('{Home}')
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

    await userEvent.keyboard('{End} tonight')
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
      '{End}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}'
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
    await userEvent.keyboard('{End} tonight')
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

async function selectSold() {
  const textbox = await focusedTextbox()
  await userEvent.keyboard(
    '{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}'
  )
  return textbox
}

describe('Editor links', () => {
  it('opens the link editor with Mod+K, and Escape returns to the selection', async () => {
    render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard(
      '{End}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}'
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
        defaultValue={soldOut}
        onValueChange={onValueChange}
      />
    )
    const textbox = await selectSold()

    await userEvent.click(screen.getByRole('button', { name: 'Link' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Link' }),
      'www.oztix.com.au/ochre-kite-weekender{Enter}'
    )

    await waitFor(() =>
      expect(
        within(textbox).getByRole('link', { name: 'Sold' })
      ).toHaveAttribute('href', TICKETS)
    )
    expect(linksIn(onValueChange.mock.lastCall![0])).toEqual([
      { href: TICKETS }
    ])
    expect(screen.queryByRole('textbox', { name: 'Link' })).toBe(null)
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
    await userEvent.keyboard('{End} ')

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
      const textbox = await selectSold()

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
    const clipboardData = new DataTransfer()
    clipboardData.setData(
      'text/html',
      `<p>Get <a href="${href}">tickets</a></p>`
    )
    clipboardData.setData('text/plain', 'Get tickets')

    textbox.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      })
    )

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

    await userEvent.keyboard('{End}!')

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
  it('reads a value in another preset into basic, keeping its text', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={richLineup}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    expect(textbox).toHaveTextContent('LineupOchre Kite Weekender')
    expect(within(textbox).queryByRole('heading')).toBe(null)

    await userEvent.keyboard('{End}!')

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(onValueChange.mock.lastCall![0].preset).toBe('basic')
    expect(lastSavedText(onValueChange)).toContain('Lineup')
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

    await userEvent.keyboard('{End}!')

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(lastSavedText(onValueChange)).toContain('Sold out!')
  })
})
