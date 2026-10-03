import { type ReactNode, useState } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Sortable, type SortableMove } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { keepFramesRunning } from '../../css/testUtils'
import { List } from '../List'
import { useStylesheet } from '../Pane/testUtils'
import { Popover } from '../Popover'

const STILL = '*, *::before, *::after { transition: none !important }'
const COLUMNS = ['Date', 'Event', 'SKU', 'Price']

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeStill()
    removeRoadie()
  }
})
afterAll(() => removeStylesheets())
// After a drop the library covers the pointer until it moves, so each test
// starts by moving it inside the frame.
beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
afterEach(() => cleanup())

type Reorder = (next: string[], move: SortableMove) => void

function Columns({
  initial = COLUMNS,
  onReorder,
  wrap = (list) => list
}: {
  initial?: string[]
  onReorder?: Reorder
  wrap?: (list: ReactNode) => ReactNode
}) {
  const [items, setItems] = useState(initial)
  return wrap(
    <Sortable
      items={items}
      label='columns'
      onReorder={(next, move) => {
        setItems(next)
        onReorder?.(next, move)
      }}
    >
      <List>
        {items.map((value) => (
          <List.Item key={value} value={value} title={value} />
        ))}
      </List>
    </Sortable>
  )
}

const handle = (name: string) =>
  screen.getByRole('button', { name: `Reorder ${name}` })
const item = (name: string) =>
  handle(name).closest<HTMLElement>('[data-slot="sortable-item"]')!
const order = () =>
  Array.from(document.querySelectorAll('[data-slot="sortable-item"]')).map(
    (element) => element.textContent
  )

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Presses the handle and moves past the drag threshold, holding the drag. */
async function startDrag(name: string) {
  const from = centre(handle(name))
  await commands.pointer([
    { type: 'move', ...from },
    { type: 'down' },
    { type: 'move', x: from.x, y: from.y + 6, steps: 3 },
    { type: 'move', x: from.x, y: from.y + 12, steps: 3 }
  ])
}

/** Moves the held pointer to `fraction` of the way down an item. */
async function hover(element: Element, fraction: number) {
  const box = element.getBoundingClientRect()
  await commands.pointer([
    {
      type: 'move',
      x: box.left + box.width / 2,
      y: box.top + box.height * fraction,
      steps: 6
    }
  ])
}

const drop = () => commands.pointer([{ type: 'up' }])

describe('Sortable drag and drop', () => {
  it('reorders with a native drag from the handle', async () => {
    const onReorder = vi.fn<Reorder>()
    render(<Columns onReorder={onReorder} />)
    await startDrag('Date')
    await hover(item('SKU'), 0.8)
    await drop()
    await waitFor(() =>
      expect(onReorder).toHaveBeenCalledWith(
        ['Event', 'SKU', 'Date', 'Price'],
        {
          value: 'Date',
          from: 0,
          to: 2
        }
      )
    )
    expect(order()).toEqual(['Event', 'SKU', 'Date', 'Price'])
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Date moved to position 3 of 4 columns'
      )
    )
  })

  it('reorders with the user-event drag helper', async () => {
    const onReorder = vi.fn<Reorder>()
    render(<Columns onReorder={onReorder} />)
    const target = item('Event')
    await userEvent.dragAndDrop(handle('Price'), target, {
      targetPosition: { x: 40, y: 4 }
    })
    await waitFor(() =>
      expect(onReorder).toHaveBeenCalledWith(
        ['Date', 'Price', 'Event', 'SKU'],
        {
          value: 'Price',
          from: 3,
          to: 1
        }
      )
    )
  })

  // Chromium under Playwright fires dragover only once, so the edge follows
  // where the pointer enters an item rather than where it rests in it.
  it('dims the dragged item and draws an accent line on the closest edge', async () => {
    render(<Columns />)
    await startDrag('Date')
    await hover(item('Price'), 0.5)
    await hover(item('SKU'), 0.8)
    await waitFor(() =>
      expect(item('SKU')).toHaveAttribute('data-drop-edge', 'bottom')
    )
    expect(item('Date')).toHaveAttribute('data-dragging')
    expect(Number(getComputedStyle(item('Date')).opacity)).toBeLessThan(1)

    const line = item('SKU').querySelector<HTMLElement>(
      '[data-slot="sortable-drop-indicator"]'
    )!
    const lineBox = line.getBoundingClientRect()
    const itemBox = item('SKU').getBoundingClientRect()
    expect(lineBox.height).toBe(2)
    expect(lineBox.width).toBeLessThan(itemBox.width)
    expect(Math.abs(lineBox.top + 1 - itemBox.bottom)).toBeLessThanOrEqual(1)
    expect(getComputedStyle(line).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

    await hover(item('Event'), 0.5)
    await hover(item('SKU'), 0.2)
    await waitFor(() =>
      expect(item('SKU')).toHaveAttribute('data-drop-edge', 'top')
    )
    expect(item('Event')).not.toHaveAttribute('data-drop-edge')
    await drop()
    await waitFor(() =>
      expect(item('Date')).not.toHaveAttribute('data-dragging')
    )
    expect(document.querySelector('[data-drop-edge]')).toBeNull()
  })

  it('draws no line where the drop would change nothing', async () => {
    render(<Columns />)
    await startDrag('Event')
    await hover(item('Date'), 0.8)
    await hover(item('SKU'), 0.2)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(document.querySelector('[data-drop-edge]')).toBeNull()
    await drop()
  })

  it('keeps the layout still while dragging', async () => {
    render(<Columns />)
    const before = COLUMNS.map((name) => item(name).getBoundingClientRect().top)
    await startDrag('Date')
    await hover(item('SKU'), 0.5)
    await waitFor(() => expect(item('SKU')).toHaveAttribute('data-drop-edge'))
    expect(
      COLUMNS.map((name) => item(name).getBoundingClientRect().top)
    ).toEqual(before)
    await drop()
  })

  it('does not drag a disabled item', async () => {
    const onReorder = vi.fn<Reorder>()
    render(
      <Sortable items={COLUMNS} onReorder={onReorder}>
        <List>
          {COLUMNS.map((value) => (
            <Sortable.Item
              key={value}
              value={value}
              label={value}
              disabled={value === 'Date'}
              render={<li />}
            >
              <Sortable.Handle />
              {value}
            </Sortable.Item>
          ))}
        </List>
      </Sortable>
    )
    await startDrag('Date')
    await hover(item('SKU'), 0.8)
    await drop()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not open the Move menu when a drag starts', async () => {
    render(<Columns />)
    await startDrag('Date')
    await hover(item('Event'), 0.8)
    await drop()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows a grab cursor on the handle', () => {
    render(<Columns />)
    expect(getComputedStyle(handle('Date')).cursor).toBe('grab')
  })
})

describe('Sortable List rows', () => {
  const background = (name: string) =>
    getComputedStyle(
      handle(name).closest<HTMLElement>('[data-slot="list-item"]')!
    ).backgroundColor

  it('paint nothing at rest in a subtler list, like plain rows', () => {
    render(<Columns />)
    expect(background('Date')).toBe('rgba(0, 0, 0, 0)')
  })

  it('keep the fill of a subtle list', () => {
    render(
      <Sortable items={['Date']} onReorder={() => {}}>
        <List emphasis='subtle'>
          <List.Item value='Date' title='Date' />
        </List>
      </Sortable>
    )
    expect(background('Date')).not.toBe('rgba(0, 0, 0, 0)')
  })
})

describe('Sortable Move menu', () => {
  it('opens on a click of the handle', async () => {
    render(<Columns />)
    await userEvent.click(handle('SKU'))
    expect(await screen.findByRole('menu')).toBeVisible()
  })

  it('closes on a second, slow click of the handle and stays closed', async () => {
    render(<Columns />)
    await userEvent.click(handle('SKU'))
    await screen.findByRole('menu')
    expect(handle('SKU')).toHaveAttribute('aria-expanded', 'true')
    const at = centre(handle('SKU'))
    await commands.pointer([{ type: 'move', ...at }, { type: 'down' }])
    const stopPressFrames = keepFramesRunning(() => at)
    try {
      await waitFor(
        () => expect(handle('SKU')).toHaveAttribute('aria-expanded', 'false'),
        { timeout: 5000 }
      )
    } finally {
      try {
        await stopPressFrames()
      } finally {
        await commands.pointer([{ type: 'up' }])
      }
    }
    keepFramesRunning(() => at)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(handle('SKU')).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull(), {
      timeout: 5000
    })
  })

  it('moves by keyboard and keeps focus on the handle', async () => {
    const onReorder = vi.fn<Reorder>()
    render(<Columns onReorder={onReorder} />)
    handle('Date').focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('menu')
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: 'Move Date down' })
      ).toHaveFocus()
    )
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(onReorder).toHaveBeenCalledWith(['Event', 'Date', 'SKU', 'Price'], {
      value: 'Date',
      from: 0,
      to: 1
    })
    await waitFor(() => expect(handle('Date')).toHaveFocus())
  })
})

describe('Sortable in context', () => {
  it('drags inside a modal popover', async () => {
    const onReorder = vi.fn<Reorder>()
    render(
      <Columns
        onReorder={onReorder}
        wrap={(list) => (
          <Popover modal defaultOpen>
            <Popover.Trigger>Columns</Popover.Trigger>
            <Popover.Content>
              <Popover.Body>{list}</Popover.Body>
            </Popover.Content>
          </Popover>
        )}
      />
    )
    await screen.findByRole('dialog')
    await waitFor(() => expect(handle('Date')).toBeVisible())
    await startDrag('Date')
    await hover(item('Price'), 0.8)
    await drop()
    await waitFor(() =>
      expect(onReorder).toHaveBeenCalledWith(
        ['Event', 'SKU', 'Price', 'Date'],
        {
          value: 'Date',
          from: 0,
          to: 3
        }
      )
    )
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('scrolls its container while dragging near the edge', async () => {
    const many = Array.from({ length: 30 }, (_, index) => `Column ${index + 1}`)
    const onReorder = vi.fn<Reorder>()
    render(
      <Columns
        initial={many}
        onReorder={onReorder}
        wrap={(list) => (
          <div data-testid='scroller' className='h-60 overflow-y-auto'>
            {list}
          </div>
        )}
      />
    )
    const scroller = screen.getByTestId('scroller')
    expect(scroller.scrollTop).toBe(0)
    await startDrag('Column 1')
    const box = scroller.getBoundingClientRect()
    await commands.pointer([
      {
        type: 'move',
        x: box.left + box.width / 2,
        y: box.bottom - 4,
        steps: 8
      },
      { type: 'wait', ms: 600 },
      { type: 'move', x: box.left + box.width / 2, y: box.bottom - 3 },
      { type: 'wait', ms: 600 }
    ])
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(40))
    await drop()
    await waitFor(() => expect(onReorder).toHaveBeenCalled())
    expect(onReorder.mock.calls[0]![1].to).toBeGreaterThan(3)
  })
})

describe('Sortable handle alignment', () => {
  const SIZES = ['xs', 'sm', 'md', 'lg'] as const
  const offset = (name: string) => {
    const icon = handle(name).querySelector('svg')!
    return centre(icon).y - centre(item(name)).y
  }

  it.each(SIZES)('centres a %s handle in a horizontal pill', (size) => {
    render(
      <Sortable
        items={['A']}
        label='tags'
        orientation='horizontal'
        onReorder={() => {}}
      >
        <Sortable.Item
          value='A'
          label='A'
          className='flex h-10 shrink-0 items-center gap-1 rounded-full emphasis-subtle ps-1 pe-4'
        >
          <Sortable.Handle size={size} />
          <span className='font-semibold text-strong'>A</span>
        </Sortable.Item>
      </Sortable>
    )
    expect(Math.abs(offset('A'))).toBeLessThanOrEqual(1)
  })

  it.each(SIZES)('centres a %s handle in a tall vertical row', (size) => {
    render(
      <Sortable items={['A']} label='rows' onReorder={() => {}}>
        <Sortable.Item
          value='A'
          label='A'
          className='flex h-16 emphasis-normal items-center gap-3 rounded-xl p-2'
        >
          <Sortable.Handle size={size} />
          <span className='font-semibold'>A</span>
        </Sortable.Item>
      </Sortable>
    )
    expect(Math.abs(offset('A'))).toBeLessThanOrEqual(1)
  })

  it.each([
    ['without', undefined],
    ['with', <span className='size-10' />]
  ])('centres the handle in a List row %s a leading slot', (_, leading) => {
    render(
      <Sortable items={['A']} label='rows' onReorder={() => {}}>
        <List>
          <List.Item
            value='A'
            title='A'
            description='Two lines tall'
            leading={leading}
          />
        </List>
      </Sortable>
    )
    const row = item('A').querySelector('[data-slot="list-item"]')!
    const icon = handle('A').querySelector('svg')!
    expect(Math.abs(centre(icon).y - centre(row).y)).toBeLessThanOrEqual(1)
  })

  it('follows a row that aligns its items to the start', () => {
    render(
      <Sortable items={['A']} label='rows' onReorder={() => {}}>
        <Sortable.Item
          value='A'
          label='A'
          className='flex h-16 emphasis-normal items-start gap-3 rounded-xl p-2'
        >
          <Sortable.Handle />
          <span className='font-semibold'>A</span>
        </Sortable.Item>
      </Sortable>
    )
    const labelTop = screen.getByText('A').getBoundingClientRect().top
    expect(handle('A').getBoundingClientRect().top).toBeCloseTo(labelTop, 0)
  })
})
