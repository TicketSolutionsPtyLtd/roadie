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
import { MOD } from './testUtils'

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
      size: { default: undefined }
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
    }
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

function renderPage() {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      extensions={[promo]}
      defaultValue={page}
      onValueChange={onValueChange}
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

  it('puts the block back on Escape', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )
    await screen.findByText('Ochre Kite Weekender!', { selector: 'p' })
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(await promoView()).toBeVisible()
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Ochre Kite Weekender'
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

  it('opens on Enter with the block selected', async () => {
    renderPage()

    await userEvent.click(await promoView())
    await userEvent.keyboard('{Enter}')

    expect(
      await screen.findByRole('dialog', { name: 'Promo settings' })
    ).toBeVisible()
  })
})
