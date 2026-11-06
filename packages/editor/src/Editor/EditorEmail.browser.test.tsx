import { render, screen, waitFor, within } from '@testing-library/react'
import { Editor as TiptapEditor, getSchema } from '@tiptap/core'
import { DOMParser, DOMSerializer, Node } from '@tiptap/pm/model'
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
import { type EditorValue, type JSONContent, presets } from '../schema'
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
function paste(target: HTMLElement, clipboardData: DataTransfer) {
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  target.dispatchEvent(event)
}

function pasteHtml(target: HTMLElement, html: string) {
  const clipboardData = new DataTransfer()
  clipboardData.setData('text/html', html)
  paste(target, clipboardData)
}

function pasteImageFile(target: HTMLElement) {
  const clipboardData = new DataTransfer()
  clipboardData.items.add(
    new File(['png'], 'poster.png', { type: 'image/png' })
  )
  paste(target, clipboardData)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Editor with the email preset', () => {
  it('leads with Blocks and the block type, then the basic controls, with no Quote, Divider, Image, Embed or Table', async () => {
    // An upload handler, as the Image control shows only with one.
    render(
      <Editor
        aria-label={LABEL}
        preset='email'
        toolbar='docked'
        onUploadImage={async () => ({
          src: 'https://assets.example.com/a.webp'
        })}
      />
    )
    const toolbar = await screen.findByRole('toolbar', { name: 'Formatting' })

    expect(
      Array.from(toolbar.children, (item) =>
        item.getAttribute('role') === 'separator'
          ? '|'
          : (item.getAttribute('aria-label') ?? item.textContent)
      )
    ).toEqual([
      'Blocks',
      '|',
      'Block type: Paragraph',
      '|',
      'Bold',
      'Italic',
      'Underline',
      'Link',
      '|',
      'List',
      '|',
      'Centre',
      '|',
      'Import HTML or MJML',
      '|',
      'Undo',
      'Redo'
    ])

    await userEvent.click(screen.getByRole('button', { name: /^Block type/ }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(4)
    expect(within(menu).queryByRole('menuitemradio', { name: /Quote/ })).toBe(
      null
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
  })

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

  it.each([
    ['a path on the site', '/images/poster.webp'],
    ['http', 'http://assets.example.com/poster.webp']
  ])(
    'refuses an uploaded image from %s, which a mail client can’t load',
    async (_, src) => {
      const onValueChange = vi.fn()
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={newsletter}
          onUploadImage={async () => ({ src })}
          onValueChange={onValueChange}
        />
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(screen.getByText('See you there.'))
      await waitFor(() => expect(textbox).toHaveFocus())

      pasteImageFile(textbox)

      expect((await screen.findByRole('alert')).textContent).toMatch(
        /couldn’t be added, as it isn’t served over https\.$/
      )
      expect(within(textbox).queryByRole('status')).toBe(null)
      expect(textbox.querySelector('img')).toBe(null)
      expect(onValueChange).not.toHaveBeenCalled()
    }
  )

  it('keeps an uploaded https image', async () => {
    const poster = 'https://assets.example.com/poster.webp'
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={newsletter}
        onUploadImage={async () => ({ src: poster, alt: 'The poster' })}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(screen.getByText('See you there.'))
    await waitFor(() => expect(textbox).toHaveFocus())

    pasteImageFile(textbox)

    expect(
      await within(textbox).findByRole('img', { name: 'The poster' })
    ).toHaveAttribute('src', poster)
  })

  it('keeps an image’s width when Replace image swaps its file', async () => {
    const stage = 'https://assets.example.com/stage.webp'
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          ...newsletter,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'image',
                attrs: {
                  src: 'https://assets.example.com/poster.webp',
                  alt: 'The poster',
                  width: 280
                }
              },
              p('See you there.')
            ]
          }
        }}
        onUploadImage={async () => ({ src: stage })}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox.querySelector('img')!)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Upload a new image' })
    )
    await userEvent.upload(
      screen.getByLabelText('Replacement image file'),
      new File(['png'], 'stage.png', { type: 'image/png' })
    )

    await waitFor(() =>
      expect(onValueChange.mock.lastCall?.[0].doc.content[0].attrs).toEqual({
        src: stage,
        alt: 'The poster',
        width: 280
      })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
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
        // WebKit lays out this unloadable image at no size in a floating
        // email, leaving nothing to click.
        toolbar='docked'
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
    // A loaded WebKit lays the failed image out late, with no size till then.
    await expect
      .poll(() => image.getBoundingClientRect().height, { timeout: 5000 })
      .toBeGreaterThan(0)

    await userEvent.click(image)
    await waitFor(() => expect(view).toHaveAttribute('data-selected'))
    const settings = await screen.findByRole('dialog', {
      name: 'Image settings'
    })
    // Once it has focus, or Escape goes to the editor instead.
    await waitFor(() =>
      expect(settings.contains(document.activeElement)).toBe(true)
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
  })
})

describe('the email preset’s HTML', () => {
  const schema = getSchema(presets.email)

  it('reads its own HTML back unchanged, as a copy and paste does', () => {
    const copied: JSONContent = {
      type: 'doc',
      content: [
        ...layout('Doors 7pm').content!,
        {
          type: 'image',
          attrs: {
            src: 'https://assets.example.com/poster.webp',
            alt: 'The poster',
            width: 280
          }
        },
        {
          type: 'spacer',
          attrs: {
            height: 40,
            showWhen: { key: 'tickets_left', op: 'lessThan', value: 20 }
          }
        }
      ]
    }
    const node = Node.fromJSON(schema, copied)
    const holder = document.createElement('div')
    holder.append(
      DOMSerializer.fromSchema(schema).serializeFragment(node.content)
    )

    // toJSON keeps the undefined rule of each block with none.
    expect(DOMParser.fromSchema(schema).parse(holder).toJSON()).toEqual(
      node.toJSON()
    )
  })

  it('inserts an image with setImage only from https', () => {
    const editor = new TiptapEditor({
      extensions: presets.email,
      content: { type: 'doc', content: [p('Doors 7pm')] }
    })

    expect(editor.commands.setImage({ src: '/images/poster.webp' })).toBe(false)
    expect(
      editor.commands.setImage({
        src: 'https://assets.example.com/poster.webp'
      })
    ).toBe(true)
    expect(editor.getJSON().content).toContainEqual({
      type: 'image',
      attrs: {
        src: 'https://assets.example.com/poster.webp',
        alt: '',
        width: null
      }
    })
    editor.destroy()
  })
})
