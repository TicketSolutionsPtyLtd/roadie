import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { server, userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { LINE_END, MOD } from './testUtils'

const LABEL = 'Newsletter'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

// The menus portal to the body, so React unmounts them before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const p = (text?: string): JSONContent =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }

const section = (...content: JSONContent[]): JSONContent => ({
  type: 'section',
  content
})

const columns = (...cells: JSONContent[][]): JSONContent => ({
  type: 'columns',
  content: cells.map((content) => ({ type: 'column', content }))
})

const newsletter = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const layout = newsletter(
  section(
    p('Alpha one'),
    p('Alpha two'),
    columns([p('Left one')], [p('Right one')])
  ),
  section(p('Bravo one')),
  p('Closing')
)

function renderNewsletter(defaultValue = layout) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

// Each block as its text, and each layout node as its type and children.
const outline = (node: JSONContent): unknown =>
  node.type === 'paragraph'
    ? (node.content?.[0]?.text ?? '')
    : node.content
      ? { [node.type!]: node.content.map(outline) }
      : node.type

const savedOutline = (onValueChange: ReturnType<typeof vi.fn>) =>
  outline((onValueChange.mock.lastCall![0] as EditorValue).doc)

const expectOutline = (
  onValueChange: ReturnType<typeof vi.fn>,
  ...content: unknown[]
) =>
  waitFor(() => expect(savedOutline(onValueChange)).toEqual({ doc: content }))

const grip = () => screen.findByRole('button', { name: 'Block actions' })
const addButton = () => screen.findByRole('button', { name: 'Add block' })

const line = (text: string) => screen.findByText(text)

function middle(element: Element) {
  const { top, bottom } = element.getBoundingClientRect()
  return (top + bottom) / 2
}

async function expectGripBeside(block: Element) {
  await waitFor(async () => {
    const { top, bottom, left } = block.getBoundingClientRect()
    const handle = (await grip()).getBoundingClientRect()
    const centre = middle(await grip())
    expect(centre).toBeGreaterThan(top)
    expect(centre).toBeLessThan(bottom)
    expect(handle.right).toBeLessThanOrEqual(left)
    // Not an outer block's grip, which sits further out.
    expect(handle.right).toBeGreaterThan(left - 8)
  })
}

async function hoverBlock(text: string) {
  const block = await line(text)
  await userEvent.hover(block)
  await expectGripBeside(block)
  return block
}

// A section's own grip shows while the pointer is in its padding.
async function hoverSection(text: string) {
  const block = (await line(text)).closest('[data-type="section"]')!
  await userEvent.hover(block, { position: { x: 4, y: 4 } })
  await expectGripBeside(block)
}

async function dropBelow(text: string) {
  const target = await line(text)
  await userEvent.dragAndDrop(await grip(), target, {
    targetPosition: { x: target.offsetWidth / 2, y: target.offsetHeight - 2 }
  })
}

async function openMenuOn(text: string) {
  await userEvent.click(await line(text))
  await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
  const menu = await screen.findByRole('menu')
  await waitFor(() => expect(menu).toBeVisible())
}

async function chooseMove(name: 'Move up' | 'Move down') {
  await userEvent.click(await screen.findByRole('menuitem', { name }))
  await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
}

// Typed after a refused drop, so the saved value proves the drop changed nothing.
async function typeAtEndOf(text: string) {
  await userEvent.click(await line(text))
  await userEvent.keyboard(`${LINE_END}!`)
}

describe('Editor email block handle', () => {
  it('shows a grip and an add button beside a block in a column', async () => {
    renderNewsletter()

    const block = await hoverBlock('Right one')

    const add = (await addButton()).getBoundingClientRect()
    expect(middle(await addButton())).toBeGreaterThan(
      block.getBoundingClientRect().top
    )
    expect(add.right).toBeLessThanOrEqual(
      (await grip()).getBoundingClientRect().left
    )
  })

  it('keeps the grip while the pointer crosses to it', async () => {
    renderNewsletter()
    await hoverBlock('Right one')
    const handle = await grip()

    await userEvent.hover(handle)

    await expectGripBeside(await line('Right one'))
  })

  it('keeps a nested block’s grip while the pointer crosses its column’s padding', async () => {
    renderNewsletter()
    const block = await hoverBlock('Right one')
    const column = block.closest('[data-type="column"]')!
    const offset =
      block.getBoundingClientRect().top - column.getBoundingClientRect().top

    await userEvent.hover(column, {
      position: { x: 4, y: offset + block.offsetHeight / 2 }
    })

    await expectGripBeside(block)
  })

  it('keeps the caret block’s grip when the pointer comes straight to it', async () => {
    renderNewsletter()
    await userEvent.click(await line('Right one'))
    await userEvent.hover(document.body, { position: { x: 1, y: 1 } })
    await expectGripBeside(await line('Right one'))

    await userEvent.hover(await grip())

    await expectGripBeside(await line('Right one'))
  })

  it('opens the caret block’s menu when the pointer comes straight to its grip', async () => {
    const onValueChange = renderNewsletter()
    await userEvent.click(await line('Right one'))
    await userEvent.hover(document.body, { position: { x: 1, y: 1 } })
    await expectGripBeside(await line('Right one'))

    await userEvent.click(await grip())
    await chooseMove('Move down')

    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: [''] }] },
          'Right one'
        ]
      },
      { section: ['Bravo one'] },
      'Closing'
    )
  })

  it('shows a section’s grip beside the whole section', async () => {
    renderNewsletter()

    await hoverSection('Bravo one')
  })

  describe.skipIf(server.browser === 'webkit')('by drag', () => {
    it('moves a block within its section', async () => {
      const onValueChange = renderNewsletter()
      await hoverBlock('Alpha one')

      await dropBelow('Alpha two')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha two',
            'Alpha one',
            { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
          ]
        },
        { section: ['Bravo one'] },
        'Closing'
      )
    })

    it('moves a block into another section', async () => {
      const onValueChange = renderNewsletter()
      await hoverBlock('Alpha one')

      await dropBelow('Bravo one')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha two',
            { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
          ]
        },
        { section: ['Bravo one', 'Alpha one'] },
        'Closing'
      )
    })

    it('moves a block into a column', async () => {
      const onValueChange = renderNewsletter()
      await hoverBlock('Alpha one')

      await dropBelow('Left one')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha two',
            {
              columns: [
                { column: ['Left one', 'Alpha one'] },
                { column: ['Right one'] }
              ]
            }
          ]
        },
        { section: ['Bravo one'] },
        'Closing'
      )
    })

    it('moves a block between columns, leaving an empty line behind', async () => {
      const onValueChange = renderNewsletter()
      await hoverBlock('Left one')

      await dropBelow('Right one')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha one',
            'Alpha two',
            {
              columns: [{ column: [''] }, { column: ['Right one', 'Left one'] }]
            }
          ]
        },
        { section: ['Bravo one'] },
        'Closing'
      )
    })

    it('moves a block out of a column to the top level', async () => {
      const onValueChange = renderNewsletter()
      await hoverBlock('Right one')

      await dropBelow('Closing')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha one',
            'Alpha two',
            { columns: [{ column: ['Left one'] }, { column: [''] }] }
          ]
        },
        { section: ['Bravo one'] },
        'Closing',
        'Right one'
      )
    })

    it('moves a section as one unit', async () => {
      const onValueChange = renderNewsletter()
      await hoverSection('Alpha one')

      await dropBelow('Closing')

      await expectOutline(
        onValueChange,
        { section: ['Bravo one'] },
        'Closing',
        {
          section: [
            'Alpha one',
            'Alpha two',
            { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
          ]
        },
        // A doc always ends in a line to type on.
        ''
      )
    })

    it('refuses a section dropped in a column', async () => {
      const onValueChange = renderNewsletter()
      await hoverSection('Bravo one')

      await dropBelow('Left one')
      await typeAtEndOf('Closing')

      await expectOutline(
        onValueChange,
        {
          section: [
            'Alpha one',
            'Alpha two',
            { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
          ]
        },
        { section: ['Bravo one'] },
        'Closing!'
      )
    })
  })

  it('hides the drop line over a place that can’t hold the dragged block', async () => {
    renderNewsletter()
    await hoverSection('Bravo one')
    const handle = await grip()
    const dataTransfer = new DataTransfer()
    const dragOver = async (text: string) => {
      const target = await line(text)
      const { left, width, bottom } = target.getBoundingClientRect()
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: left + width / 2,
        clientY: bottom - 2
      })
      target.dispatchEvent(event)
      return event
    }
    const dropLine = () =>
      document.querySelector('.prosemirror-dropcursor-block')
    handle.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, dataTransfer })
    )

    await dragOver('Closing')
    await waitFor(() => expect(dropLine()).not.toBe(null))
    const refused = await dragOver('Left one')

    expect(refused.dataTransfer!.dropEffect).toBe('none')
    await waitFor(() => expect(dropLine()).toBe(null))
    handle.dispatchEvent(
      new DragEvent('dragend', { bubbles: true, dataTransfer })
    )
  })

  it('draws the drop line as Sortable does, thick and in the accent colour', async () => {
    renderNewsletter()
    await hoverSection('Bravo one')
    const handle = await grip()
    const dataTransfer = new DataTransfer()
    const target = await line('Closing')
    const { left, width, bottom } = target.getBoundingClientRect()
    handle.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, dataTransfer })
    )
    target.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: left + width / 2,
        clientY: bottom - 2
      })
    )
    const dropLine = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        '.prosemirror-dropcursor-block'
      )
      expect(found).not.toBe(null)
      return found!
    })
    const accent = document.createElement('div')
    accent.className = 'intent-accent bg-strong'
    document.body.append(accent)

    const style = getComputedStyle(dropLine)
    expect(style.backgroundColor).toBe(getComputedStyle(accent).backgroundColor)
    expect(dropLine.getBoundingClientRect().height).toBe(2)
    expect(style.borderTopLeftRadius).not.toBe('0px')
    handle.dispatchEvent(
      new DragEvent('dragend', { bubbles: true, dataTransfer })
    )
  })

  it('adds a block after its own from the add button', async () => {
    const onValueChange = renderNewsletter()
    await hoverBlock('Alpha one')

    await userEvent.click(await addButton())
    await userEvent.click(
      await screen.findByRole('option', { name: 'Divider' })
    )

    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          'horizontalRule',
          '',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
        ]
      },
      { section: ['Bravo one'] },
      'Closing'
    )
  })

  it('adds a block into an empty column from its add button', async () => {
    const onValueChange = renderNewsletter(
      newsletter(section(columns([p('Left one')], [p()])))
    )
    const empty = (await line('Left one'))
      .closest('[data-type="columns"]')!
      .querySelectorAll('[data-type="column"] > p')[1]!
    await userEvent.hover(empty)
    await expectGripBeside(empty)

    await userEvent.click(await addButton())
    await userEvent.click(
      await screen.findByRole('option', { name: 'Divider' })
    )

    await expectOutline(
      onValueChange,
      {
        section: [
          {
            columns: [
              { column: ['Left one'] },
              { column: ['horizontalRule', ''] }
            ]
          }
        ]
      },
      ''
    )
  })

  it('moves a block into and out of columns by keyboard', async () => {
    const onValueChange = renderNewsletter()

    await openMenuOn('Alpha two')
    await chooseMove('Move down')
    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          {
            columns: [
              { column: ['Alpha two', 'Left one'] },
              { column: ['Right one'] }
            ]
          }
        ]
      },
      { section: ['Bravo one'] },
      'Closing'
    )

    await openMenuOn('Alpha two')
    await chooseMove('Move up')
    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
        ]
      },
      { section: ['Bravo one'] },
      'Closing'
    )
  })

  it('moves a block into an empty column in place of its empty line', async () => {
    const onValueChange = renderNewsletter(
      newsletter(section(columns([p('Left one'), p('Left two')], [p()])))
    )

    await openMenuOn('Left two')
    await chooseMove('Move down')

    await expectOutline(
      onValueChange,
      {
        section: [
          { columns: [{ column: ['Left one'] }, { column: ['Left two'] }] }
        ]
      },
      ''
    )
  })

  it('moves the last block of the last column out after the columns', async () => {
    const onValueChange = renderNewsletter()

    await openMenuOn('Right one')
    await chooseMove('Move down')

    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: [''] }] },
          'Right one'
        ]
      },
      { section: ['Bravo one'] },
      'Closing'
    )
  })

  it('moves a block from the top level into the section above', async () => {
    const onValueChange = renderNewsletter()

    await openMenuOn('Closing')
    await chooseMove('Move up')

    await expectOutline(
      onValueChange,
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
        ]
      },
      { section: ['Bravo one', 'Closing'] },
      ''
    )
  })

  it('moves the caret’s whole section by keyboard', async () => {
    const onValueChange = renderNewsletter()
    await openMenuOn('Bravo one')

    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Select section' })
    )
    await chooseMove('Move up')

    await expectOutline(
      onValueChange,
      { section: ['Bravo one'] },
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
        ]
      },
      'Closing'
    )
  })

  it('offers no parent to select for a top-level block', async () => {
    renderNewsletter()

    await openMenuOn('Closing')

    expect(screen.queryByRole('menuitem', { name: /^Select/ })).toBe(null)
  })

  it('moves a section past the section above it by keyboard', async () => {
    const onValueChange = renderNewsletter()
    await hoverSection('Bravo one')
    await userEvent.click(await grip())
    await screen.findByRole('menu')

    await chooseMove('Move up')

    await expectOutline(
      onValueChange,
      { section: ['Bravo one'] },
      {
        section: [
          'Alpha one',
          'Alpha two',
          { columns: [{ column: ['Left one'] }, { column: ['Right one'] }] }
        ]
      },
      'Closing'
    )
  })
})
