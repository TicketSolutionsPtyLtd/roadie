import { StrictMode } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { server, userEvent } from 'vitest/browser'

import { Dialog } from '@oztix/roadie-components/dialog'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'
import { LINE_END, MOD } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const block = (blockId: string, text: string) => ({
  type: 'paragraph',
  attrs: { blockId },
  content: [{ type: 'text', text }]
})

const lineup: EditorValue = {
  version: 1,
  preset: 'blocks',
  doc: {
    type: 'doc',
    content: [
      block('doors', 'Doors 7pm'),
      block('support', 'Support 8pm'),
      block('headliner', 'Headliner 9pm')
    ]
  }
}

function renderLineup(props: Partial<Parameters<typeof Editor>[0]> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={lineup}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const handle = () => screen.findByRole('button', { name: 'Block actions' })

const paragraph = async (text: string) =>
  (await screen.findByRole('textbox', { name: LABEL })).querySelector(
    `p:nth-child(${['Doors', 'Support', 'Headliner'].indexOf(text) + 1})`
  ) as HTMLElement

function middle(element: Element) {
  const { top, bottom } = element.getBoundingClientRect()
  return (top + bottom) / 2
}

async function expectHandleBeside(text: string) {
  const row = await paragraph(text)
  await waitFor(async () => {
    const { top, bottom } = row.getBoundingClientRect()
    const centre = middle(await handle())
    expect(centre).toBeGreaterThan(top)
    expect(centre).toBeLessThan(bottom)
  })
}

const order = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map((node) => [
    node.attrs?.blockId,
    node.content?.[0]?.text
  ])

async function openMenuOn(text: string) {
  await userEvent.hover(await paragraph(text))
  await expectHandleBeside(text)
  await userEvent.click(await handle())
  return screen.findByRole('menu')
}

describe('Editor block handle', () => {
  it('shows beside the block under the pointer', async () => {
    renderLineup()

    await userEvent.hover(await paragraph('Support'))

    await expectHandleBeside('Support')
  })

  it('shows beside the caret’s block while the pointer is elsewhere', async () => {
    renderLineup()
    await userEvent.click(await paragraph('Headliner'))

    await userEvent.hover(document.body, { position: { x: 1, y: 1 } })

    await expectHandleBeside('Headliner')
  })

  it('stays beside the hovered block while typing in one above it', async () => {
    renderLineup()
    await userEvent.click(await paragraph('Doors'))
    await userEvent.hover(await paragraph('Headliner'))
    await expectHandleBeside('Headliner')

    await userEvent.keyboard('x')

    await expectHandleBeside('Headliner')
  })

  it('makes room for the grip inside a framed editor, before the text', async () => {
    renderLineup()
    const row = await paragraph('Doors')
    await userEvent.hover(row)
    await expectHandleBeside('Doors')

    const grip = (await handle()).getBoundingClientRect()
    const frame = row.closest('[data-slot="editor"]')!.getBoundingClientRect()
    expect(grip.left).toBeGreaterThanOrEqual(frame.left)
    expect(grip.right).toBeLessThanOrEqual(row.getBoundingClientRect().left)
  })

  it('takes a click below the blocks of a tall editor into the text', async () => {
    renderLineup({ className: 'h-96' })
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const frame = textbox.closest('[data-slot="editor"]') as HTMLElement

    await userEvent.click(frame, {
      position: { x: frame.offsetWidth / 2, y: frame.offsetHeight - 8 }
    })

    expect(textbox).toHaveFocus()
  })

  it.each([
    [
      'Move up',
      'Support',
      [
        ['support', 'Support 8pm'],
        ['doors', 'Doors 7pm'],
        ['headliner', 'Headliner 9pm']
      ]
    ],
    [
      'Move down',
      'Support',
      [
        ['doors', 'Doors 7pm'],
        ['headliner', 'Headliner 9pm'],
        ['support', 'Support 8pm']
      ]
    ],
    [
      'Delete',
      'Support',
      [
        ['doors', 'Doors 7pm'],
        ['headliner', 'Headliner 9pm']
      ]
    ]
  ])('%s from the block menu', async (action, text, expected) => {
    const onValueChange = renderLineup()

    await openMenuOn(text)
    await userEvent.click(screen.getByRole('menuitem', { name: action }))

    await waitFor(() => expect(order(onValueChange)).toEqual(expected))
  })

  it('leaves an empty paragraph when the only block is deleted', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          ...lineup,
          doc: { type: 'doc', content: [block('doors', 'Doors 7pm')] }
        }}
        onValueChange={onValueChange}
      />
    )

    await openMenuOn('Doors')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content
      ).toEqual([{ type: 'paragraph', attrs: { blockId: expect.any(String) } }])
    )
  })

  it('duplicates a block below it, with an id of its own', async () => {
    const onValueChange = renderLineup()

    await openMenuOn('Doors')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

    await waitFor(() => expect(order(onValueChange)).toHaveLength(4))
    const [first, copy] = order(onValueChange)
    expect(first).toEqual(['doors', 'Doors 7pm'])
    expect(copy![1]).toBe('Doors 7pm')
    expect(copy![0]).toEqual(expect.any(String))
    expect(copy![0]).not.toBe('doors')
  })

  it('turns off Move up on the first block and Move down on the last', async () => {
    renderLineup()

    await openMenuOn('Doors')
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    await userEvent.keyboard('{Escape}')
    await openMenuOn('Headliner')

    expect(screen.getByRole('menuitem', { name: 'Move down' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('moves the caret’s block by keyboard, from Mod+/, and undoes the move', async () => {
    const onValueChange = renderLineup()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await paragraph('Headliner'))

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
    const menu = await screen.findByRole('menu')
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Move up' })).toHaveFocus()
    )
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(order(onValueChange).map(([id]) => id)).toEqual([
        'doors',
        'headliner',
        'support'
      ])
    )
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(order(onValueChange).map(([id]) => id)).toEqual([
        'doors',
        'support',
        'headliner'
      ])
    )
  })

  it('undoes each block action on its own, however quickly they follow', async () => {
    const onValueChange = renderLineup()
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    await openMenuOn('Doors')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))
    await openMenuOn('Headliner')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move up' }))
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(order(onValueChange).map(([id]) => id)).toEqual([
        'support',
        'doors',
        'headliner'
      ])
    )
  })

  it('takes no Tab stop, which would move focus off the block it shows for', async () => {
    render(
      <>
        <Editor aria-label={LABEL} defaultValue={lineup} />
        <button type='button'>After</button>
      </>
    )
    await userEvent.click(await paragraph('Doors'))
    await expectHandleBeside('Doors')

    await userEvent.keyboard('{Tab}')

    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('closes the block menu on Escape, back to the text', async () => {
    renderLineup()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await paragraph('Doors'))

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
    await screen.findByRole('menu')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    await waitFor(() => expect(textbox).toHaveFocus())
  })

  it.skipIf(server.browser === 'webkit')(
    'moves a block dragged by its handle, keeping its id',
    async () => {
      const onValueChange = renderLineup()
      await userEvent.hover(await paragraph('Doors'))
      await expectHandleBeside('Doors')
      const target = await paragraph('Headliner')

      await userEvent.dragAndDrop(await handle(), target, {
        targetPosition: {
          x: target.offsetWidth - 2,
          y: target.offsetHeight / 2
        }
      })

      await waitFor(() =>
        expect(order(onValueChange)).toEqual([
          ['support', 'Support 8pm'],
          ['headliner', 'Headliner 9pm'],
          ['doors', 'Doors 7pm']
        ])
      )
    }
  )

  it.each([
    ['in the rich preset', { preset: 'rich' as const }],
    ['while read-only', { readOnly: true }]
  ])('has no handle %s', async (_, props) => {
    renderLineup(props)

    await userEvent.hover(await paragraph('Support'))

    await expect(
      screen.findByRole('button', { name: 'Block actions' }, { timeout: 300 })
    ).rejects.toThrow()
  })

  it('stays while the pointer crosses the gap to a grip outside a subtler editor', async () => {
    render(
      <div className='ps-12'>
        <Editor aria-label={LABEL} defaultValue={lineup} emphasis='subtler' />
      </div>
    )
    const row = await paragraph('Support')
    await userEvent.hover(row)
    await expectHandleBeside('Support')
    const y = row.offsetHeight / 2

    await userEvent.hover(row, { position: { x: -2, y }, force: true })

    await expectHandleBeside('Support')
  })

  it('goes back to the caret’s block once the pointer leaves the editor', async () => {
    render(
      <div className='max-w-80'>
        <Editor aria-label={LABEL} defaultValue={lineup} />
      </div>
    )
    await userEvent.click(await paragraph('Doors'))
    const support = await paragraph('Support')
    await userEvent.hover(support)
    await expectHandleBeside('Support')

    await userEvent.hover(document.body, {
      position: { x: 600, y: middle(support) },
      force: true
    })

    await expectHandleBeside('Doors')
  })

  it('hides once the editor loses focus and the pointer is elsewhere', async () => {
    render(
      <>
        <Editor aria-label={LABEL} defaultValue={lineup} />
        <button type='button'>After</button>
      </>
    )
    await userEvent.click(await paragraph('Doors'))
    await expectHandleBeside('Doors')

    await userEvent.click(screen.getByRole('button', { name: 'After' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Block actions' })).toBe(null)
    )
  })

  it('opens the block menu from Mod+/ while the / menu is open, closing it', async () => {
    renderLineup()
    await userEvent.click(await paragraph('Support'))
    await userEvent.keyboard(`${LINE_END}{Enter}/`)
    await screen.findByRole('listbox', { name: 'Insert' })
    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)

    await waitFor(() => expect(screen.getByRole('menu')).toBeVisible())
    expect(screen.queryByRole('listbox', { name: 'Insert' })).toBe(null)
  })

  it('closes the block menu on Escape without closing the dialog around it', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Title>Compose</Dialog.Title>
          <Editor aria-label={LABEL} defaultValue={lineup} />
        </Dialog.Content>
      </Dialog>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await paragraph('Doors'))

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
    await screen.findByRole('menu')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    await waitFor(() => expect(textbox).toHaveFocus())
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('has no handle in the email preset', async () => {
    render(
      <Editor
        aria-label={LABEL}
        preset='email'
        defaultValue={{ ...lineup, preset: 'email' }}
      />
    )

    await userEvent.hover(await paragraph('Support'))

    await expect(
      screen.findByRole('button', { name: 'Block actions' }, { timeout: 300 })
    ).rejects.toThrow()
  })

  it('works under StrictMode', async () => {
    const onValueChange = vi.fn()
    render(
      <StrictMode>
        <Editor
          aria-label={LABEL}
          defaultValue={lineup}
          onValueChange={onValueChange}
        />
      </StrictMode>
    )

    await openMenuOn('Doors')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))

    await waitFor(() =>
      expect(order(onValueChange).map(([id]) => id)).toEqual([
        'support',
        'doors',
        'headliner'
      ])
    )
    expect(
      document.querySelectorAll('[data-slot="editor-block-handle-host"]')
    ).toHaveLength(1)
  })

  it('unmounts cleanly with the block menu open', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const thrown: unknown[] = []
    const onError = (event: ErrorEvent) => thrown.push(event.error)
    window.addEventListener('error', onError)
    const { unmount } = render(
      <Editor aria-label={LABEL} defaultValue={lineup} />
    )
    await openMenuOn('Doors')

    unmount()

    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    window.removeEventListener('error', onError)
    errors.mockRestore()
    expect(thrown).toEqual([])
    expect(errors).not.toHaveBeenCalled()
  })

  it('closes the block menu when the editor turns read-only, and keeps it closed after', async () => {
    const { rerender } = render(
      <Editor aria-label={LABEL} defaultValue={lineup} />
    )
    await openMenuOn('Doors')

    rerender(<Editor aria-label={LABEL} defaultValue={lineup} readOnly />)
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    rerender(<Editor aria-label={LABEL} defaultValue={lineup} />)

    await expect(
      screen.findByRole('menu', {}, { timeout: 300 })
    ).rejects.toThrow()
  })

  const setList: EditorValue = {
    version: 1,
    preset: 'blocks',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { blockId: 'acts' },
          content: ['Support', 'Headliner'].map((act) => ({
            type: 'listItem',
            attrs: { blockId: act.toLowerCase() },
            content: [
              {
                type: 'paragraph',
                attrs: { blockId: `${act.toLowerCase()}-text` },
                content: [{ type: 'text', text: act }]
              }
            ]
          }))
        },
        block('doors', 'Doors 7pm')
      ]
    }
  }

  const ids = (value: EditorValue) => {
    const found: unknown[] = []
    const walk = (node: {
      attrs?: Record<string, unknown>
      content?: unknown[]
    }) => {
      if (node.attrs && 'blockId' in node.attrs) found.push(node.attrs.blockId)
      node.content?.forEach((child) => walk(child as typeof node))
    }
    value.doc.content!.forEach((node) => walk(node))
    return found
  }

  it('gives a duplicated list and everything in it new ids', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={setList}
        onValueChange={onValueChange}
      />
    )
    const list = (
      await screen.findByRole('textbox', { name: LABEL })
    ).querySelector('ul') as HTMLElement
    await userEvent.hover(list)
    await userEvent.click(await handle())
    await screen.findByRole('menu')

    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content
      ).toHaveLength(3)
    )
    const saved = ids(onValueChange.mock.lastCall![0] as EditorValue)
    expect(saved.slice(0, 5)).toEqual([
      'acts',
      'support',
      'support-text',
      'headliner',
      'headliner-text'
    ])
    expect(saved).toHaveLength(11)
    expect(saved.every((id) => typeof id === 'string')).toBe(true)
    expect(new Set(saved).size).toBe(saved.length)
  })

  it.skipIf(server.browser === 'webkit')(
    'keeps the ids inside a list dragged by its handle',
    async () => {
      const onValueChange = vi.fn()
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={setList}
          onValueChange={onValueChange}
        />
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      const list = textbox.querySelector('ul') as HTMLElement
      await userEvent.hover(list)
      const target = textbox.lastElementChild as HTMLElement

      await userEvent.dragAndDrop(await handle(), target, {
        targetPosition: {
          x: target.offsetWidth - 2,
          y: target.offsetHeight / 2
        }
      })

      await waitFor(() =>
        // StarterKit's trailing node adds a paragraph after a list left last.
        expect(
          ids(onValueChange.mock.lastCall![0] as EditorValue).slice(0, 6)
        ).toEqual([
          'doors',
          'acts',
          'support',
          'support-text',
          'headliner',
          'headliner-text'
        ])
      )
    }
  )
})
