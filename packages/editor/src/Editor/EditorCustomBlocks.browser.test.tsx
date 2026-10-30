import { useState } from 'react'

import { TicketIcon } from '@phosphor-icons/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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
import { renderEditorValue } from '../render'
import type { EditorValue } from '../schema'

const LABEL = 'Page'

// The block handle sits outside the text, where a click lands only with styles.
let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

function EventCardView({ node, updateAttributes }: EditorNodeViewProps) {
  return (
    <NodeViewWrapper data-slot='event-card'>
      <input
        aria-label='Event'
        value={String(node.attrs.eventId ?? '')}
        onChange={(event) => updateAttributes({ eventId: event.target.value })}
      />
    </NodeViewWrapper>
  )
}

const EventCard = Node.create({
  name: 'eventCard',
  group: 'block',
  atom: true,
  addAttributes: () => ({ eventId: { default: '' } }),
  parseHTML: () => [{ tag: 'div[data-event-card]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-event-card': '' })
  ],
  addNodeView: () => reactNodeView(EventCardView)
})

const eventCard: EditorBlock = {
  node: EventCard,
  label: 'Event card',
  icon: TicketIcon,
  keywords: ['gig']
}

const nodeMapping = {
  eventCard: ({ attrs }: { attrs: Record<string, unknown> }) => (
    <aside>Event {String(attrs.eventId)}</aside>
  )
}

const lastValue = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall![0] as EditorValue

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

describe('Editor extensions', () => {
  it('inserts an app’s block from the slash menu, found by a keyword', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        extensions={[eventCard]}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()

    await userEvent.keyboard('/gig')
    const option = await screen.findByRole('option', { name: 'Event card' })
    expect(option.querySelector('svg')).not.toBe(null)
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('textbox', { name: 'Event' })).toBeVisible()
    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content![0]).toMatchObject({
        type: 'eventCard',
        attrs: { eventId: '', blockId: expect.any(String) }
      })
    )
  })

  it('saves what its view edits, and renders it through /render', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        extensions={[eventCard]}
        onValueChange={onValueChange}
        defaultValue={{
          version: 1,
          preset: 'blocks',
          doc: {
            type: 'doc',
            content: [{ type: 'eventCard', attrs: { eventId: 'okw' } }]
          }
        }}
      />
    )

    const input = await screen.findByRole('textbox', { name: 'Event' })
    await userEvent.type(input, '-2026')

    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content![0]!.attrs).toMatchObject({
        eventId: 'okw-2026'
      })
    )
    expect(
      renderToString(
        renderEditorValue(lastValue(onValueChange), { nodeMapping })
      )
    ).toContain('<aside>Event <!-- -->okw-2026</aside>')
  })

  it.each([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }]
  ])('leaves an app’s block as it is in a %s editor', async (_, props) => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        {...props}
        extensions={[eventCard]}
        onValueChange={onValueChange}
        defaultValue={{
          version: 1,
          preset: 'blocks',
          doc: {
            type: 'doc',
            content: [{ type: 'eventCard', attrs: { eventId: 'okw' } }]
          }
        }}
      />
    )

    const input = await screen.findByRole('textbox', { name: 'Event' })
    await userEvent.type(input, '-2026')

    expect(input).toHaveValue('okw')
    const savedIds = onValueChange.mock.calls.map(
      ([saved]) => (saved as EditorValue).doc.content![0]!.attrs!.eventId
    )
    expect(savedIds.filter((id) => id !== 'okw')).toEqual([])
  })

  it('keeps an app’s block through a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState<EditorValue>({
        version: 1,
        preset: 'blocks',
        doc: {
          type: 'doc',
          content: [
            { type: 'eventCard', attrs: { eventId: 'okw' } },
            { type: 'paragraph' }
          ]
        }
      })
      return (
        <Editor
          aria-label={LABEL}
          extensions={[eventCard]}
          value={value}
          onValueChange={setValue}
        />
      )
    }
    render(<Controlled />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox.querySelector('p')!)

    await userEvent.keyboard('Doors 7pm')

    await waitFor(() => expect(textbox).toHaveTextContent('Doors 7pm'))
    expect(within(textbox).getByRole('textbox', { name: 'Event' })).toHaveValue(
      'okw'
    )
  })

  it('submits an app’s block before the editor loads', () => {
    const html = renderToString(
      <Editor
        aria-label={LABEL}
        name='page'
        extensions={[eventCard]}
        defaultValue={{
          version: 1,
          preset: 'blocks',
          doc: {
            type: 'doc',
            content: [{ type: 'eventCard', attrs: { eventId: 'okw' } }]
          }
        }}
      />
    )

    expect(html).toContain('eventCard')
  })

  it('leaves out a block named for one of the preset’s own nodes', async () => {
    vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const taken: EditorBlock = {
      ...eventCard,
      node: EventCard.extend({ name: 'paragraph' })
    }
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        extensions={[taken]}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()

    await userEvent.keyboard('Doors 7pm')

    await waitFor(() =>
      expect(lastValue(onValueChange).doc.content![0]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Doors 7pm' }]
      })
    )
    expect(screen.queryByRole('textbox', { name: 'Event' })).toBe(null)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/already has paragraph/)
    )
    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('leaves an app’s blocks out of other presets', async () => {
    // A browser has no `process`; a consumer's bundler supplies NODE_ENV.
    vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Editor aria-label={LABEL} preset='rich' extensions={[eventCard]} />)
    await focusedTextbox()

    await userEvent.keyboard('/')

    expect(screen.queryByRole('listbox')).toBe(null)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/extensions are for the blocks preset/)
    )
    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('duplicates and moves an app’s block from the block handle', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        extensions={[eventCard]}
        onValueChange={onValueChange}
        defaultValue={{
          version: 1,
          preset: 'blocks',
          doc: {
            type: 'doc',
            content: [
              { type: 'eventCard', attrs: { eventId: 'okw', blockId: 'card' } },
              {
                type: 'paragraph',
                attrs: { blockId: 'doors' },
                content: [{ type: 'text', text: 'Doors 7pm' }]
              }
            ]
          }
        }}
      />
    )
    const blocks = () =>
      lastValue(onValueChange).doc.content!.map((node) => [
        node.type,
        node.attrs?.blockId
      ])
    const openMenu = async () => {
      const [first] = await screen.findAllByRole('textbox', { name: 'Event' })
      await userEvent.hover(first!)
      await userEvent.click(
        await screen.findByRole('button', { name: 'Block actions' })
      )
      return screen.findByRole('menu')
    }

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

    await waitFor(() => expect(blocks()).toHaveLength(3))
    const [card, copy] = blocks()
    expect(card).toEqual(['eventCard', 'card'])
    expect(copy![0]).toBe('eventCard')
    expect(copy![1]).not.toBe('card')
    expect(lastValue(onValueChange).doc.content![1]!.attrs!.eventId).toBe('okw')

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))

    await waitFor(() =>
      expect(blocks().map(([, id]) => id)).toEqual([copy![1], 'card', 'doors'])
    )
  })
})
