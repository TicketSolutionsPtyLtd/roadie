import { StrictMode } from 'react'

import { TicketIcon } from '@phosphor-icons/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { userEvent, page as viewport } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  type EditorBlock,
  type EditorNodeViewProps,
  Node,
  NodeViewWrapper,
  mergeAttributes,
  reactNodeView
} from '../extensions'
import type { EditorValue } from '../schema'
import { LINE_END, MOD, clickIntoEditor } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

function PromoView({ node }: EditorNodeViewProps) {
  return (
    <NodeViewWrapper data-slot='promo'>
      <p>{String(node.attrs.title)}</p>
      <p>{String(node.attrs.tone)}</p>
      <ul>
        {(node.attrs.lineup as { name: string }[]).map(({ name }) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </NodeViewWrapper>
  )
}

const promo: EditorBlock = {
  label: 'Promo',
  icon: TicketIcon,
  node: Node.create({
    name: 'promo',
    group: 'block',
    atom: true,
    addAttributes: () => ({
      title: { default: 'Ochre Kite Weekender' },
      tone: { default: 'calm' },
      size: { default: undefined },
      lineup: {
        default: [{ name: 'Velvet Kookaburra', photo: { src: '', alt: '' } }]
      },
      tickets: { default: { label: 'Get tickets', href: '/tickets' } }
    }),
    parseHTML: () => [{ tag: 'div[data-promo]' }],
    renderHTML: ({ HTMLAttributes }) => [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-promo': '' })
    ],
    addNodeView: () => reactNodeView(PromoView)
  }),
  settings: [
    { name: 'title', label: 'Title', type: 'text' },
    {
      name: 'tone',
      label: 'Tone',
      type: 'choice',
      options: [
        { value: 'calm', label: 'Calm' },
        { value: 'loud', label: 'Loud' }
      ]
    },
    {
      name: 'size',
      label: 'Size',
      type: 'choice',
      defaultValue: 'md',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' }
      ]
    },
    {
      name: 'lineup',
      label: 'Lineup',
      type: 'list',
      itemLabel: 'Act',
      fields: [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'photo', label: 'Photo', type: 'image' }
      ]
    },
    { name: 'tickets', label: 'Tickets', type: 'action' }
  ]
}

const page: EditorValue = {
  version: 1,
  preset: 'blocks',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { blockId: 'intro' },
        content: [{ type: 'text', text: 'Doors 7pm' }]
      },
      { type: 'promo', attrs: { blockId: 'promo' } }
    ]
  }
}

function renderPage(props: Partial<Parameters<typeof Editor>[0]> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      extensions={[promo]}
      defaultValue={page}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const savedPromo = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content![1]!.attrs

const promoView = () =>
  screen.findByText('Ochre Kite Weekender', { selector: 'p' })

async function openFromMenu() {
  await userEvent.hover(await promoView())
  await userEvent.click(
    await screen.findByRole('button', { name: 'Block actions' })
  )
  const menu = await screen.findByRole('menu')
  const [first] = within(menu).getAllByRole('menuitem')
  expect(first).toHaveTextContent('Settings')
  await userEvent.click(first!)
  return screen.findByRole('dialog', { name: 'Promo settings' })
}

describe('Editor block settings', () => {
  it('leads the block menu with Settings, which opens a Field for each setting', async () => {
    renderPage()

    const drawer = await openFromMenu()

    expect(within(drawer).getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Ochre Kite Weekender'
    )
    expect(
      within(drawer).getByRole('button', { name: 'Calm' })
    ).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() =>
      expect(
        within(drawer).getByRole('textbox', { name: 'Title' })
      ).toHaveFocus()
    )
  })

  it('offers no Settings for a block without them', async () => {
    renderPage()

    await userEvent.hover(await screen.findByText('Doors 7pm'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block actions' })
    )

    expect(
      within(await screen.findByRole('menu'))
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).not.toContain('Settings')
  })

  it('applies each change as it’s made', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    const title = within(drawer).getByRole('textbox', { name: 'Title' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Kazoo Hollow')
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))

    expect(
      await screen.findByText('Kazoo Hollow', { selector: 'p' })
    ).toBeVisible()
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Kazoo Hollow',
      tone: 'loud'
    })
  })

  it('keeps the changes on a click away, as one step to undo', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Ochre Kite Weekender!',
      tone: 'loud'
    })
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(savedPromo(onValueChange)).toMatchObject({
        title: 'Ochre Kite Weekender',
        tone: 'calm'
      })
    )
  })

  it('keeps Tab in the drawer while it’s open', async () => {
    renderPage()
    const drawer = await openFromMenu()

    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard('{Tab}')
      expect(drawer).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('shows a choice’s default while its attr is unset', async () => {
    renderPage()
    const drawer = await openFromMenu()

    expect(
      within(drawer).getByRole('button', { name: 'Medium' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('types after the block once its settings close on a phone, rather than replacing it', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    const onValueChange = renderPage()
    const drawer = await openFromMenu()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))

    // A tap above the sheet, on the page, closes it.
    await userEvent.click(document.body, { position: { x: 4, y: 4 } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await userEvent.keyboard('x')

    await waitFor(() =>
      expect(savedPromo(onValueChange)).toMatchObject({ tone: 'loud' })
    )
    expect(await promoView()).toBeVisible()
  })

  it('keeps the changes on Enter in a text setting', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!{Enter}'
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Ochre Kite Weekender!'
    })
  })

  it('leaves the next block whole when settings close between two blocks', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        extensions={[promo]}
        onValueChange={onValueChange}
        defaultValue={{
          ...page,
          doc: {
            type: 'doc',
            content: [
              { type: 'promo', attrs: { blockId: 'first' } },
              {
                type: 'promo',
                attrs: { blockId: 'second', title: 'Kazoo Hollow' }
              },
              {
                type: 'paragraph',
                attrs: { blockId: 'outro' },
                content: [{ type: 'text', text: 'Gates 6pm' }]
              }
            ]
          }
        }}
      />
    )
    const drawer = await openFromMenu()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))

    await userEvent.click(document.body, { position: { x: 4, y: 4 } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await userEvent.keyboard('x')

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content
      ).toMatchObject([
        { type: 'promo', attrs: { tone: 'loud' } },
        { type: 'promo', attrs: { title: 'Kazoo Hollow' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'xGates 6pm' }] }
      ])
    )
  })

  // ProseMirror reads a change to a block's DOM as an edit and re-reads the
  // selection, which closes the drawer on a block that holds content.
  it('leaves the block’s DOM alone as its phone sheet opens', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage()
    const block = (await promoView()).closest('.react-renderer')!
    const changes: MutationRecord[] = []
    const observer = new MutationObserver((records) => changes.push(...records))
    // ProseMirror marks the selected node itself, so only style is watched.
    observer.observe(block, { attributes: true, attributeFilter: ['style'] })

    await openFromMenu()
    observer.disconnect()

    expect(changes).toEqual([])
  })

  it('brings the block near the top, above its phone sheet, from inside a scrolling pane', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    render(
      // The pane is at its top, so only the page can give the block room.
      <div style={{ height: 2400 }}>
        <div style={{ height: 800 }} />
        <div style={{ height: 600, overflowY: 'auto' }}>
          <Editor
            aria-label={LABEL}
            extensions={[promo]}
            defaultValue={{
              ...page,
              doc: { type: 'doc', content: [...page.doc.content!].reverse() }
            }}
          />
          <div style={{ height: 1200 }} />
        </div>
      </div>
    )

    await userEvent.click(await promoView())
    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })

    await waitFor(() => {
      const top = screen
        .getByText('Ochre Kite Weekender', { selector: 'p' })
        .getBoundingClientRect().top
      expect(top).toBeGreaterThan(700 * 0.1)
      expect(top).toBeLessThan(drawer.getBoundingClientRect().top)
    })
  })

  it('opens on Enter with the block selected', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await userEvent.keyboard('{End}{ArrowDown}{Enter}')

    expect(
      await screen.findByRole('dialog', { name: 'Promo settings' })
    ).toBeVisible()
  })

  it('opens on a click, at the list item clicked', async () => {
    renderPage()

    await userEvent.click(await screen.findByText('Velvet Kookaburra'))

    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })
    await waitFor(() =>
      expect(
        within(drawer).getByRole('textbox', { name: 'Name' })
      ).toHaveFocus()
    )
    expect(within(drawer).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Velvet Kookaburra'
    )
  })

  it('adds, edits and removes a list’s items', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add act' })
    )
    const names = within(drawer).getAllByRole('textbox', { name: 'Name' })
    await userEvent.type(names.at(-1)!, 'Marri Lane')
    await waitFor(() =>
      expect(savedPromo(onValueChange)!.lineup).toEqual([
        { name: 'Velvet Kookaburra', photo: { src: '', alt: '' } },
        { name: 'Marri Lane' }
      ])
    )
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Velvet Kookaburra' })
    )

    await waitFor(() =>
      expect(savedPromo(onValueChange)!.lineup).toEqual([
        { name: 'Marri Lane' }
      ])
    )
    expect(
      await screen.findByText('Marri Lane', { selector: 'li' })
    ).toBeVisible()
  })

  it('reorders a list’s items from its handle’s menu', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add act' })
    )
    await userEvent.type(
      within(drawer).getAllByRole('textbox', { name: 'Name' }).at(-1)!,
      'Marri Lane'
    )

    const handles = within(drawer).getAllByRole('button', { name: /^Reorder/ })
    await userEvent.click(handles[0]!)
    await userEvent.click(
      await screen.findByRole('menuitem', {
        name: 'Move Velvet Kookaburra down'
      })
    )

    await waitFor(() =>
      expect(
        (savedPromo(onValueChange)!.lineup as { name: string }[]).map(
          ({ name }) => name
        )
      ).toEqual(['Marri Lane', 'Velvet Kookaburra'])
    )
  })

  it('sets an image by its link and alt text, and refuses a link that can’t load', async () => {
    const onValueChange = renderPage()
    await userEvent.click(await screen.findByText('Velvet Kookaburra'))
    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })
    const photo = within(drawer).getByRole('group', { name: 'Photo' })

    await userEvent.type(
      within(photo).getByRole('textbox', { name: 'Image address' }),
      'http://example.com/a.jpg'
    )
    expect(
      within(photo).getByRole('textbox', { name: 'Image address' })
    ).toHaveAttribute('aria-invalid', 'true')
    await userEvent.clear(
      within(photo).getByRole('textbox', { name: 'Image address' })
    )
    await userEvent.type(
      within(photo).getByRole('textbox', { name: 'Image address' }),
      '/blocks/velvet.webp'
    )
    await userEvent.type(
      within(photo).getByRole('textbox', { name: 'Alt text' }),
      'The band on stage'
    )

    await waitFor(() =>
      expect(savedPromo(onValueChange)!.lineup).toMatchObject([
        { photo: { src: '/blocks/velvet.webp', alt: 'The band on stage' } }
      ])
    )
  })

  it('sets an action’s label and link, keeping an unsafe link out', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()
    const tickets = within(drawer).getByRole('group', { name: 'Tickets' })

    await userEvent.type(
      within(tickets).getByRole('textbox', { name: 'Label' }),
      '!'
    )
    const link = within(tickets).getByRole('textbox', { name: 'Link' })
    await userEvent.clear(link)
    await userEvent.type(link, 'javascript:alert(1)')

    await waitFor(() => expect(link).toHaveAttribute('aria-invalid', 'true'))
    expect(savedPromo(onValueChange)!.tickets).toMatchObject({
      label: 'Get tickets!'
    })
    expect(
      String((savedPromo(onValueChange)!.tickets as { href: string }).href)
    ).not.toMatch(/^javascript:/i)
  })

  it('keeps the changes on Done', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))
    await userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedPromo(onValueChange)).toMatchObject({ tone: 'loud' })
  })

  it('makes room for the block beside the drawer on a wide page', async () => {
    await viewport.viewport(1280, 800)
    renderPage()

    const drawer = await openFromMenu()

    await waitFor(() =>
      expect(
        document.querySelector('[data-slot=promo]')!.getBoundingClientRect()
          .right
      ).toBeLessThanOrEqual(drawer.getBoundingClientRect().left + 1)
    )
  })

  it('marks its phone sheet as the editor’s popup', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage()

    expect(await openFromMenu()).toHaveAttribute('data-editor-popup')
  })

  it('closes on Escape with nothing changed, leaving the history alone', async () => {
    const onValueChange = renderPage()
    await userEvent.click(await screen.findByText('Doors 7pm'))
    await userEvent.keyboard('!')
    await openFromMenu()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content![0]
      ).toMatchObject({ content: [{ text: 'Doors 7pm' }] })
    )
  })

  it('uploads an image, and says so when it can’t', async () => {
    const onUploadImage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Too big'))
      .mockResolvedValueOnce({ src: '/uploads/band.webp', alt: 'The band' })
    const onValueChange = vi.fn()
    // StrictMode mounts twice, which an upload must outlive.
    render(
      <StrictMode>
        <Editor
          aria-label={LABEL}
          extensions={[promo]}
          defaultValue={page}
          onValueChange={onValueChange}
          onUploadImage={onUploadImage}
        />
      </StrictMode>
    )
    await userEvent.click(await screen.findByText('Velvet Kookaburra'))
    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })
    const file = new File(['x'], 'band.webp', { type: 'image/webp' })

    await userEvent.upload(within(drawer).getByLabelText('Photo file'), file)
    expect(await within(drawer).findByRole('alert')).toHaveTextContent(
      'That image couldn’t be uploaded.'
    )
    await userEvent.upload(within(drawer).getByLabelText('Photo file'), file)

    await waitFor(() =>
      expect(savedPromo(onValueChange)!.lineup).toMatchObject([
        { photo: { src: '/uploads/band.webp', alt: 'The band' } }
      ])
    )
    expect(within(drawer).queryByRole('alert')).toBe(null)
  })

  it('opens the item clicked when two share their text', async () => {
    renderPage({
      defaultValue: {
        ...page,
        doc: {
          type: 'doc',
          content: [
            {
              type: 'promo',
              attrs: {
                lineup: [
                  { name: 'Marri Lane', photo: { src: '', alt: '' } },
                  { name: 'Marri Lane', photo: { src: '', alt: '' } }
                ]
              }
            }
          ]
        }
      }
    })

    const [, second] = await screen.findAllByText('Marri Lane')
    await userEvent.click(second!)

    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })
    const names = within(drawer).getAllByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(names.at(-1)).toHaveFocus())
    expect(names).toHaveLength(1)
    expect(
      within(drawer).getByRole('button', { name: 'Remove Marri Lane (2)' })
    ).toBeVisible()
  })

  it('leaves a drag that selects text ending on a block alone', async () => {
    renderPage()
    const doors = await screen.findByText('Doors 7pm')
    const name = await screen.findByText('Velvet Kookaburra')
    const centre = (element: Element) => {
      const box = element.getBoundingClientRect()
      return { clientX: box.left + 4, clientY: box.top + box.height / 2 }
    }
    const press = (element: Element, at = centre(element)) =>
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
          button: 0,
          ...at
        })
      )
    const release = (element: Element) =>
      element.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          button: 0,
          ...centre(element)
        })
      )

    // A click selects the block as it opens it, at once.
    const selected = () => name.closest('.ProseMirror-selectednode')

    press(doors)
    release(name)
    expect(selected()).toBe(null)
    press(name)
    release(name)

    expect(selected()).not.toBe(null)
    expect(
      await screen.findByRole('dialog', { name: 'Promo settings' })
    ).toBeVisible()
  })

  const tap = (element: Element) => {
    const box = element.getBoundingClientRect()
    const at = { clientX: box.left + 4, clientY: box.top + box.height / 2 }
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerType: 'touch',
        button: 0,
        ...at
      })
    )
    // A tap's compatibility mouse events, which ProseMirror selects with.
    element.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, ...at })
    )
    element.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, button: 0, ...at })
    )
  }

  it('opens on a second tap, at the item tapped, expanded', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage()
    const name = await screen.findByText('Velvet Kookaburra')
    const selected = () => name.closest('.ProseMirror-selectednode')

    tap(name)
    await waitFor(() => expect(selected()).not.toBe(null))
    expect(screen.queryByRole('dialog')).toBe(null)
    tap(name)

    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })
    expect(within(drawer).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Velvet Kookaburra'
    )
  })

  it('focuses a new item’s first field', async () => {
    renderPage()
    const drawer = await openFromMenu()

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add act' })
    )

    await waitFor(() =>
      expect(
        within(drawer).getAllByRole('textbox', { name: 'Name' }).at(-1)
      ).toHaveFocus()
    )
  })

  it('keeps a gap between the block and the drawer, and the block where it was', async () => {
    await viewport.viewport(1280, 800)
    renderPage()
    const name = await screen.findByText('Velvet Kookaburra')
    const before = name.getBoundingClientRect().top

    await userEvent.click(name)
    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })

    await waitFor(() =>
      expect(
        document.querySelector('[data-slot=promo]')!.getBoundingClientRect()
          .right
      ).toBeLessThanOrEqual(drawer.getBoundingClientRect().left - 8)
    )
    expect(
      Math.abs(name.getBoundingClientRect().top - before)
    ).toBeLessThanOrEqual(4)
  })

  it('keeps the last block above its phone sheet', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    render(
      <div style={{ paddingTop: 900 }}>
        <Editor
          aria-label={LABEL}
          extensions={[promo]}
          defaultValue={{
            ...page,
            doc: { type: 'doc', content: [page.doc.content![1]!] }
          }}
        />
      </div>
    )

    const drawer = await openFromMenu()

    await waitFor(() => {
      const top = document
        .querySelector('[data-slot=promo]')!
        .getBoundingClientRect().top
      expect(top).toBeGreaterThan(0)
      expect(top).toBeLessThan(drawer.getBoundingClientRect().top)
    })
  })

  it('keeps the changes on Escape, and Undo takes the visit back in one step', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Ochre Kite Weekender!',
      tone: 'loud'
    })
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(savedPromo(onValueChange)).toMatchObject({
        title: 'Ochre Kite Weekender',
        tone: 'calm'
      })
    )
  })

  it('says Undo puts the changes back', async () => {
    renderPage()

    const drawer = await openFromMenu()

    expect(drawer).toHaveAccessibleDescription(
      'Changes apply as you go. Undo puts them back.'
    )
  })

  it.each([
    [
      'Done',
      async (drawer: HTMLElement) =>
        userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))
    ],
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    [
      'a click away',
      async () => userEvent.click(document.body, { position: { x: 4, y: 4 } })
    ]
  ])(
    'keeps the caret where it was after %s, and the next key types there',
    async (_, close) => {
      const onValueChange = renderPage()
      await clickIntoEditor(await screen.findByText('Doors 7pm'))
      await userEvent.keyboard(LINE_END)

      const drawer = await openFromMenu()
      await userEvent.click(
        within(drawer).getByRole('button', { name: 'Loud' })
      )
      await close(drawer)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
      await userEvent.keyboard('!')

      await waitFor(() =>
        expect(
          (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.slice(
            0,
            2
          )
        ).toMatchObject([
          { type: 'paragraph', content: [{ text: 'Doors 7pm!' }] },
          { type: 'promo', attrs: { tone: 'loud' } }
        ])
      )
    }
  )

  it('leaves the block selected when its settings opened from the keyboard', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('Doors 7pm'))
    await userEvent.keyboard('{End}{ArrowDown}{Enter}')
    const drawer = await screen.findByRole('dialog', { name: 'Promo settings' })

    await userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(
      screen.getByText('Velvet Kookaburra').closest('.ProseMirror-selectednode')
    ).not.toBe(null)
  })

  it('leaves the page where the author scrolled it while they type in the sheet', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    render(
      <div style={{ paddingTop: 900, paddingBottom: 900 }}>
        <Editor aria-label={LABEL} extensions={[promo]} defaultValue={page} />
      </div>
    )
    const drawer = await openFromMenu()
    const scroller = document.scrollingElement!
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0))

    scroller.scrollTop -= 60
    const scrolled = scroller.scrollTop
    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      'ab'
    )

    expect(scroller.scrollTop).toBe(scrolled)
  })
})
