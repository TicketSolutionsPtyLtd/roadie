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

  it('makes room for the grip and add button inside a framed editor', async () => {
    renderNewsletter()

    await hoverBlock('Closing')

    const textbox = await screen.findByRole('textbox', { name: LABEL })
    expect(
      (await addButton()).getBoundingClientRect().left
    ).toBeGreaterThanOrEqual(textbox.getBoundingClientRect().left)
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

  describe('pointer paths', () => {
    // Synthetic moves, one step at a time, so a state between two hovers counts.
    function moveThrough(points: { x: number; y: number }[]) {
      for (const { x, y } of points) {
        document.elementFromPoint(x, y)?.dispatchEvent(
          new MouseEvent('mousemove', {
            bubbles: true,
            clientX: x,
            clientY: y
          })
        )
      }
    }

    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(resolve))

    it('keeps a nested block’s grip at every step from the block to its grip', async () => {
      renderNewsletter()
      const block = await hoverBlock('Right one')
      const target = (await grip()).getBoundingClientRect()
      const y = middle(block)
      const seen: string[] = []

      for (
        let x = block.getBoundingClientRect().left + 2;
        x > target.left + 2;
        x -= 2
      ) {
        moveThrough([{ x, y }])
        await nextFrame()
        const shown = document.querySelector(
          '[data-slot="editor-block-handle"]'
        )
        seen.push(shown ? `${Math.round(middle(shown))}` : 'none')
      }

      expect(new Set(seen)).toEqual(
        new Set([`${Math.round(middle(await grip()))}`])
      )
    })

    it('keeps a tall nested block’s handle beside its lower lines, out to the add button', async () => {
      renderNewsletter(
        newsletter(
          section(
            columns(
              [p('Left one')],
              [p('Right one, which runs on over several lines of its column')]
            )
          )
        )
      )
      const block = await line(
        'Right one, which runs on over several lines of its column'
      )
      expect(block.offsetHeight).toBeGreaterThan(32)
      await userEvent.hover(block)
      await expectGripBeside(block)
      const add = (await addButton()).getBoundingClientRect()

      moveThrough([
        {
          x: (add.left + add.right) / 2,
          y: block.getBoundingClientRect().bottom - 4
        }
      ])
      await nextFrame()

      await expectGripBeside(block)
    })

    it('keeps a nested block’s grip in its gutter after typing above it', async () => {
      renderNewsletter()
      await userEvent.click(await line('Alpha one'))
      const block = await hoverBlock('Right one')
      const y = middle(block)
      const gap = block.getBoundingClientRect().left - 2
      moveThrough([{ x: gap, y }])

      await userEvent.keyboard('x')
      moveThrough([{ x: gap - 1, y }])
      await nextFrame()

      await expectGripBeside(block)
    })

    it('keeps the grip of the block the pointer is on once focus leaves the text', async () => {
      render(
        <>
          <Editor aria-label={LABEL} preset='email' defaultValue={layout} />
          <button type='button'>After</button>
        </>
      )
      await userEvent.click(await line('Right one'))
      moveThrough([{ x: 1, y: 1 }])
      const handle = await grip()
      const { left, top, width, height } = handle.getBoundingClientRect()
      moveThrough([{ x: left + width / 2, y: top + height / 2 }])

      screen.getByRole('button', { name: 'After' }).focus()
      await nextFrame()

      await expectGripBeside(await line('Right one'))
    })

    it('keeps the grip of the block a tap lands on once focus leaves the text', async () => {
      render(
        <>
          <Editor aria-label={LABEL} preset='email' defaultValue={layout} />
          <button type='button'>After</button>
        </>
      )
      await userEvent.click(await line('Right one'))
      moveThrough([{ x: 1, y: 1 }])

      // A tap brings no mousemove before focus moves.
      ;(await grip()).dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      )
      screen.getByRole('button', { name: 'After' }).focus()
      await nextFrame()

      await expectGripBeside(await line('Right one'))
    })

    it('keeps a handle while the pointer runs down the add buttons outside a subtler editor', async () => {
      render(
        <div className='max-w-80 ps-16'>
          <Editor
            aria-label={LABEL}
            preset='email'
            emphasis='subtler'
            defaultValue={newsletter(p('First'), p(), p(), p('Last'))}
          />
        </div>
      )
      await hoverBlock('First')
      const add = (await addButton()).getBoundingClientRect()
      const x = (add.left + add.right) / 2
      const last = await line('Last')

      for (let y = add.bottom + 1; y < middle(last); y += 4)
        moveThrough([{ x, y }])

      await waitFor(async () =>
        expect(middle(await addButton())).toBeGreaterThan(
          last.getBoundingClientRect().top
        )
      )
    })

    describe('right to left', () => {
      function renderRtl() {
        render(
          <div dir='rtl'>
            <Editor aria-label={LABEL} preset='email' defaultValue={layout} />
          </div>
        )
      }

      async function expectGripAfter(block: Element) {
        await waitFor(async () => {
          const { top, bottom, right } = block.getBoundingClientRect()
          const handle = (await grip()).getBoundingClientRect()
          expect(middle(await grip())).toBeGreaterThan(top)
          expect(middle(await grip())).toBeLessThan(bottom)
          expect(handle.left).toBeGreaterThanOrEqual(right)
          expect(handle.left).toBeLessThan(right + 8)
        })
      }

      it('puts the add button beyond the grip, on the right', async () => {
        renderRtl()
        const block = await line('Right one')
        await userEvent.hover(block)
        await expectGripAfter(block)

        const add = (await addButton()).getBoundingClientRect()
        expect(add.left).toBeGreaterThanOrEqual(
          (await grip()).getBoundingClientRect().right
        )
        expect(middle(await addButton())).toBeGreaterThan(
          block.getBoundingClientRect().top
        )
      })

      it('keeps a nested block’s grip while the pointer crosses its column’s padding', async () => {
        renderRtl()
        const block = await line('Left one')
        await userEvent.hover(block)
        await expectGripAfter(block)
        // In the gap before the grip, over the column's padding.
        moveThrough([
          { x: block.getBoundingClientRect().right + 2, y: middle(block) }
        ])

        await expectGripAfter(block)
      })
    })
  })
})
