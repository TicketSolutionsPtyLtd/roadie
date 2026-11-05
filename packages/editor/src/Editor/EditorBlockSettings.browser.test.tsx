import { TicketIcon } from '@phosphor-icons/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

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
      tone: { default: 'calm' }
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

  it('keeps the changes on Done, as one step to undo', async () => {
    const onValueChange = renderPage()
    const drawer = await openFromMenu()

    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))
    await userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedPromo(onValueChange)).toMatchObject({
      title: 'Ochre Kite Weekender!',
      tone: 'loud'
    })
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
    )
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(savedPromo(onValueChange)).toMatchObject({
        title: 'Ochre Kite Weekender',
        tone: 'calm'
      })
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
