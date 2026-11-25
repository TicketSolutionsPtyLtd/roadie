import { useState } from 'react'

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sortable, type SortableHandleProps, type SortableMove } from '.'
import budget from '../../../size-budget.json'
import { List } from '../List'
import { Lanes, listed } from './lanesTestUtils'

const COLUMNS = ['Date', 'Event', 'SKU', 'Price']

type HarnessProps = {
  initial?: string[]
  onReorder?: (next: string[], move: SortableMove) => void
  disabled?: boolean
  orientation?: 'vertical' | 'horizontal'
}

function Columns({
  initial = COLUMNS,
  onReorder,
  disabled,
  orientation
}: HarnessProps) {
  const [items, setItems] = useState(initial)
  return (
    <Sortable
      items={items}
      label='columns'
      orientation={orientation}
      disabled={disabled}
      onReorder={(next, move) => {
        setItems(next)
        onReorder?.(next, move)
      }}
    >
      <ul>
        {items.map((value) => (
          <Sortable.Item
            key={value}
            value={value}
            label={value}
            render={<li />}
          >
            <Sortable.Handle />
            {value}
          </Sortable.Item>
        ))}
      </ul>
    </Sortable>
  )
}

const order = () =>
  Array.from(document.querySelectorAll('[data-slot="sortable-item"]')).map(
    (item) => item.textContent
  )

const handle = (name: string) =>
  screen.getByRole('button', { name: `Reorder ${name}` })

async function openMenu(name: string) {
  const user = userEvent.setup()
  handle(name).focus()
  await user.keyboard('{Enter}')
  return { user, menu: await screen.findByRole('menu') }
}

describe('Sortable', () => {
  it('is the same reference as Sortable.Root', () => {
    expect(Sortable).toBe(Sortable.Root)
  })

  it('renders items with a named handle that opens a menu', () => {
    render(<Columns />)
    expect(order()).toEqual(COLUMNS)
    const button = handle('SKU')
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('data-slot', 'sortable-handle')
    expect(button.closest('[data-slot="sortable-item"]')?.tagName).toBe('LI')
  })

  // Each row ends with whether the menu skips its transition, as it does for
  // a keyboard's click, and how many keys, presses and clicks the handle hears.
  it.each([
    ['Enter', '{Enter}', 'menuitem', 'Move B up', true, 2],
    ['Space', ' ', 'menuitem', 'Move B up', true, 2],
    ['the down arrow', '{ArrowDown}', 'menuitem', 'Move B up', false, 1],
    ['the up arrow', '{ArrowUp}', 'menuitem', 'Move B to bottom', false, 1],
    // A press that became a drag sent no click, so it opens nothing later.
    ['Enter after a drag', '{Enter}', 'menuitem', 'Move B up', true, 3],
    ['a press', null, 'menu', 'Reorder B', false, 2]
  ])(
    'opens on %s with focus where that puts it, hearing it once',
    async (name, key, role, focused, instant, events) => {
      const heard = vi.fn()
      const above = vi.fn()
      const ref = { current: null as HTMLButtonElement | null }
      const all = { onKeyDown: heard, onPointerDown: heard, onClick: heard }
      const user = userEvent.setup()
      render(
        <Sortable items={['A', 'B', 'C']} onReorder={() => {}}>
          <div onKeyDown={above} onPointerDown={above} onClick={above}>
            <Sortable.Item value='B' label='B'>
              <Sortable.Handle ref={ref} {...all} />
            </Sortable.Item>
          </div>
        </Sortable>
      )
      expect(ref.current).toBe(handle('B'))
      if (name.endsWith('drag')) fireEvent.pointerDown(handle('B'))
      if (key) handle('B').focus()
      await (key ? user.keyboard(key) : user.click(handle('B')))
      const target = await screen.findByRole(role, { name: focused })
      await waitFor(() => expect(target).toHaveFocus())
      expect(ref.current).toBe(handle('B'))
      expect(handle('B')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('menu').hasAttribute('data-instant')).toBe(
        instant
      )
      expect(heard).toHaveBeenCalledTimes(events)
      expect(above).toHaveBeenCalledTimes(events)
      await user.keyboard('{Escape}')
      await waitFor(() => expect(handle('B')).toHaveFocus())
    }
  )

  it('keeps the page still on the arrow key that opens the menu', () => {
    render(<Columns />)
    expect(fireEvent.keyDown(handle('SKU'), { key: 'ArrowDown' })).toBe(false)
  })

  it('leaves a handle as it was once its menu has opened and closed', async () => {
    const attributes = (name: string) =>
      Array.from(handle(name).attributes)
        .filter(({ name }) => name !== 'id' && name !== 'aria-label')
        .map(({ name, value }) => `${name}=${value}`)
        .sort()
    render(<Columns />)
    const { id } = handle('SKU')
    const { user } = await openMenu('SKU')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(handle('SKU')).toHaveFocus())
    expect(id).not.toBe('')
    expect(handle('SKU').id).toBe(id)
    expect(attributes('SKU')).toEqual(attributes('Date'))
    expect(handle('SKU').innerHTML).toBe(handle('Date').innerHTML)
    expect(handle('Date')).toHaveAttribute('aria-expanded', 'false')
  })

  it('lists the moves and disables the ones past the ends', async () => {
    render(<Columns />)
    const { menu } = await openMenu('Date')
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Move Date up',
      'Move Date down',
      'Move Date to top',
      'Move Date to bottom'
    ])
    expect(items.map((item) => item.hasAttribute('aria-disabled'))).toEqual([
      true,
      false,
      true,
      false
    ])
  })

  it('disables down and bottom on the last item', async () => {
    render(<Columns />)
    const { menu } = await openMenu('Price')
    const disabled = within(menu)
      .getAllByRole('menuitem')
      .filter((item) => item.hasAttribute('aria-disabled'))
      .map((item) => item.textContent)
    expect(disabled).toEqual(['Move Price down', 'Move Price to bottom'])
  })

  it('moves an item, reports the move and keeps focus on its handle', async () => {
    const onReorder = vi.fn()
    render(<Columns onReorder={onReorder} />)
    const { user } = await openMenu('SKU')
    await user.click(screen.getByRole('menuitem', { name: 'Move SKU down' }))
    expect(onReorder).toHaveBeenCalledWith(['Date', 'Event', 'Price', 'SKU'], {
      value: 'SKU',
      from: 2,
      to: 3
    })
    expect(order()).toEqual(['Date', 'Event', 'Price', 'SKU'])
    await waitFor(() => expect(handle('SKU')).toHaveFocus())
  })

  it('moves to the top and the bottom', async () => {
    const onReorder = vi.fn()
    render(<Columns onReorder={onReorder} />)
    let { user } = await openMenu('SKU')
    await user.click(screen.getByRole('menuitem', { name: 'Move SKU to top' }))
    expect(order()).toEqual(['SKU', 'Date', 'Event', 'Price'])
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )
    ;({ user } = await openMenu('Event'))
    await user.click(
      screen.getByRole('menuitem', { name: 'Move Event to bottom' })
    )
    expect(order()).toEqual(['SKU', 'Date', 'Price', 'Event'])
    expect(onReorder).toHaveBeenLastCalledWith(expect.any(Array), {
      value: 'Event',
      from: 2,
      to: 3
    })
  })

  it('announces the new position politely', async () => {
    render(<Columns />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toBeEmptyDOMElement()
    const { user } = await openMenu('SKU')
    await user.click(screen.getByRole('menuitem', { name: 'Move SKU up' }))
    await waitFor(() =>
      expect(status).toHaveTextContent('SKU moved to position 2 of 4 columns')
    )
  })

  it('empties the live region before each message, so a repeat is read', async () => {
    render(<Columns initial={['A', 'B']} />)
    const status = screen.getByRole('status')
    const seen: string[] = []
    new MutationObserver(() => seen.push(status.textContent ?? '')).observe(
      status,
      { childList: true, characterData: true, subtree: true }
    )
    const move = async (label: string) => {
      const { user } = await openMenu('A')
      await user.click(screen.getByRole('menuitem', { name: label }))
      await waitFor(() =>
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      )
      await waitFor(() => expect(status).not.toBeEmptyDOMElement())
    }
    await move('Move A down')
    await move('Move A up')
    await move('Move A down')
    expect(seen.filter((text) => text !== '').at(-1)).toBe(
      'A moved to position 2 of 2 columns'
    )
    expect(seen.at(-2)).toBe('')
  })

  it('does not pull focus later when a move is not applied', async () => {
    function Rejecting() {
      const [items, setItems] = useState(['A', 'B', 'C'])
      return (
        <>
          <button type='button' onClick={() => setItems(['C', 'B', 'A'])}>
            Reverse
          </button>
          <Sortable items={items} onReorder={() => {}}>
            {items.map((value) => (
              <Sortable.Item key={value} value={value} label={value}>
                <Sortable.Handle />
              </Sortable.Item>
            ))}
          </Sortable>
        </>
      )
    }
    render(<Rejecting />)
    const { user } = await openMenu('A')
    await user.click(screen.getByRole('menuitem', { name: 'Move A down' }))
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )
    // The claim lapses in the frame that announces the move.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('A moved')
    )
    const reverse = screen.getByRole('button', { name: 'Reverse' })
    await user.click(reverse)
    expect(reverse).toHaveFocus()
  })

  it('passes a ref through to the item element', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(
      <Sortable items={['A']} onReorder={() => {}}>
        <Sortable.Item value='A' ref={ref}>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    expect(ref.current).toHaveAttribute('data-slot', 'sortable-item')
  })

  it('warns about an item whose value is not in items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Sortable items={['A']} onReorder={() => {}}>
        <Sortable.Item value='Z'>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"Z" is not in its Sortable\'s items')
    )
    warn.mockRestore()
  })

  it("doesn't warn about a disabled item left out of items, such as one leaving", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Sortable items={['A']} onReorder={() => {}}>
        <Sortable.Item value='Z' disabled>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('names horizontal moves by side', async () => {
    render(<Columns orientation='horizontal' />)
    const { menu } = await openMenu('SKU')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual([
      'Move SKU left',
      'Move SKU right',
      'Move SKU to start',
      'Move SKU to end'
    ])
  })

  it('opens the menu on a click, not on the press that may start a drag', async () => {
    render(<Columns />)
    const button = handle('SKU')
    vi.useFakeTimers()
    try {
      fireEvent.pointerDown(button, { pointerType: 'mouse' })
      fireEvent.mouseDown(button)
      act(() => vi.runOnlyPendingTimers())
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
    fireEvent.mouseUp(button)
    fireEvent.click(button)
    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })

  it('opens the menu on a tap that sends no mouse events', async () => {
    render(<Columns />)
    const button = handle('SKU')
    // WebKit sends no compatibility mouse events when something cancels the
    // touch's pointerdown, such as a drawer listening for a swipe.
    fireEvent.pointerDown(button, { pointerType: 'touch' })
    fireEvent.pointerUp(button, { pointerType: 'touch' })
    fireEvent.click(button)
    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })

  it('disables the moves in an open menu when the sortable becomes disabled', async () => {
    const onReorder = vi.fn()
    const view = (disabled: boolean) => (
      <Sortable items={['A', 'B']} onReorder={onReorder} disabled={disabled}>
        {['A', 'B'].map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
    const { rerender } = render(view(false))
    const { user } = await openMenu('A')
    rerender(view(true))
    const down = screen.getByRole('menuitem', { name: 'Move A down' })
    expect(down).toHaveAttribute('aria-disabled', 'true')
    await user.click(down)
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('keeps the handle a button: it takes no href or disabled of its own', () => {
    const handleProps = (props: SortableHandleProps) => props
    // @ts-expect-error the handle never navigates
    handleProps({ href: '/elsewhere' })
    // @ts-expect-error disable the item, not its handle
    handleProps({ disabled: true })
    expect(handleProps({})).toEqual({})
  })

  it('disables one item and its handle with disabled on the item', () => {
    render(
      <Sortable items={['A', 'B']} onReorder={() => {}}>
        <Sortable.Item value='A' label='A' disabled>
          <Sortable.Handle />
        </Sortable.Item>
        <Sortable.Item value='B' label='B'>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    expect(handle('A')).toBeDisabled()
    expect(handle('B')).toBeEnabled()
    expect(handle('A').closest('[data-slot="sortable-item"]')).toHaveAttribute(
      'data-disabled'
    )
  })

  it('disables every handle when disabled', () => {
    render(<Columns disabled />)
    for (const name of COLUMNS) expect(handle(name)).toBeDisabled()
  })

  it('marks items for styling', () => {
    render(<Columns />)
    const item = handle('SKU').closest('[data-slot="sortable-item"]')!
    expect(item).not.toHaveAttribute('data-dragging')
    expect(item).not.toHaveAttribute('data-drop-edge')
    expect(item).toHaveClass('relative')
  })
})

describe('List inside Sortable', () => {
  function Reorderable({ onReorder }: Pick<HarnessProps, 'onReorder'>) {
    const [items, setItems] = useState(COLUMNS)
    return (
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

  it('gives a valued row a leading handle and no button of its own', () => {
    render(<Reorderable />)
    const button = handle('SKU')
    const row = button.closest('[data-slot="list-item"]')!
    expect(row.tagName).toBe('DIV')
    expect(
      row.querySelector('[data-slot="list-item-leading"]')
    ).toContainElement(button)
    expect(row.parentElement?.tagName).toBe('LI')
    expect(row.parentElement).toHaveAttribute('data-slot', 'sortable-item')
    expect(screen.getAllByRole('button')).toHaveLength(COLUMNS.length)
  })

  it('reorders rows from the Move menu', async () => {
    const onReorder = vi.fn()
    render(<Reorderable onReorder={onReorder} />)
    const { user } = await openMenu('Date')
    await user.click(screen.getByRole('menuitem', { name: 'Move Date down' }))
    expect(onReorder).toHaveBeenCalledWith(['Event', 'Date', 'SKU', 'Price'], {
      value: 'Date',
      from: 0,
      to: 1
    })
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent)
    ).toEqual(['Event', 'Date', 'SKU', 'Price'])
  })

  it('warns that a reorderable row drops its href', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Sortable items={['sku']} onReorder={() => {}}>
        <List>
          <List.Item value='sku' title='SKU' href='/columns/sku' />
        </List>
      </Sortable>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('List.Item with a value inside a Sortable')
    )
    warn.mockRestore()
  })

  it('keeps a valued row a plain button outside a Sortable', () => {
    render(
      <List>
        <List.Item value='sku' title='SKU' />
      </List>
    )
    expect(screen.getByRole('button', { name: 'SKU' })).toHaveAttribute(
      'data-slot',
      'list-item'
    )
  })

  it('keeps a row without a value a plain button inside a Sortable', () => {
    render(
      <Sortable items={[]} onReorder={() => {}}>
        <List>
          <List.Item title='Add column' onClick={() => {}} />
        </List>
      </Sortable>
    )
    expect(screen.getByRole('button', { name: 'Add column' })).toHaveAttribute(
      'data-slot',
      'list-item'
    )
  })
})

describe('Sortable Move to another list', () => {
  const moves = (menu: HTMLElement) =>
    within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent)
      .slice(4)

  it('offers each other list in the group, named by its label', async () => {
    render(
      <Lanes
        initial={{ todo: ['Date'], doing: [], done: ['SKU'] }}
        done={{ label: 'Finished' }}
      />
    )
    const { menu } = await openMenu('Date')
    expect(moves(menu)).toEqual(['Move Date to doing', 'Move Date to Finished'])
    expect(within(menu).getByRole('separator')).toBeInTheDocument()
  })

  it('offers the lists in another section from a submenu, and announces where the item went', async () => {
    render(
      <Lanes
        initial={{ todo: ['Date'], doing: [], done: ['SKU'] }}
        done={{ section: 'Next week' }}
      />
    )
    const { user, menu } = await openMenu('Date')
    expect(moves(menu)).toEqual([
      'Move Date to doing',
      'Move Date to Next week'
    ])
    await user.keyboard('{End}')
    expect(
      within(menu).getByRole('menuitem', { name: 'Move Date to Next week' })
    ).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: 'Move Date to done in Next week' })
      ).toHaveFocus()
    )
    await user.keyboard('{Enter}')
    expect(listed('done')).toEqual(['SKU', 'Date'])
    await waitFor(() =>
      expect(
        screen.getAllByRole('status').map((status) => status.textContent)
      ).toContain('Date moved to position 2 of 2 done in Next week')
    )
  })

  it.each([
    ['refuses it', { canDrop: () => false }],
    ['is disabled', { done: { disabled: true } }],
    ['has no onTransfer', { done: { onTransfer: undefined } }],
    ['is in another group', { done: { group: 'archive' } }]
  ] as const)('leaves out a list that %s', async (_, props) => {
    render(<Lanes {...props} />)
    const { menu } = await openMenu('Date')
    expect(moves(menu)).toEqual([])
    expect(within(menu).queryByRole('separator')).toBeNull()
  })
})

it("keeps the Move menu out of a sortable list's first load", () => {
  const { full, initial } = budget['./sortable']
  // Base UI's menu is about 39 kB of brotli, none of it loaded with the list.
  expect(full - initial).toBeGreaterThan(30_000)
})
