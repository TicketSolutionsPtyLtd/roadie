import { render, screen, waitFor, within } from '@testing-library/react'
import { Editor as TiptapEditor, getSchema } from '@tiptap/core'
import { DOMParser, DOMSerializer, Node } from '@tiptap/pm/model'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import { type EditorValue, type JSONContent, presets } from '../schema'
import { LINE_END } from './testUtils'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

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
  it('leads with the block type, then the basic controls, with no Quote, Divider, Image, Embed or Table', async () => {
    // An upload handler, as the Image control shows only with one.
    render(
      <Editor
        aria-label={LABEL}
        preset='email'
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
        { type: 'spacer', attrs: { height: 40 } }
      ]
    }
    const holder = document.createElement('div')
    holder.append(
      DOMSerializer.fromSchema(schema).serializeFragment(
        Node.fromJSON(schema, copied).content
      )
    )

    expect(DOMParser.fromSchema(schema).parse(holder).toJSON()).toEqual(copied)
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
