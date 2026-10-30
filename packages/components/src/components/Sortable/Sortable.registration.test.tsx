import { useState } from 'react'

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sortable } from '.'
import * as dnd from './dnd'

vi.mock('./dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof dnd>()
  return {
    ...actual,
    sortableDropTarget: vi.fn(actual.sortableDropTarget),
    sortableDraggable: vi.fn(actual.sortableDraggable),
    sortableMonitor: vi.fn(actual.sortableMonitor)
  }
})

function Columns() {
  const [items, setItems] = useState(['Date', 'Event', 'SKU'])
  const [, setTick] = useState(0)
  return (
    <>
      <button type='button' onClick={() => setTick((tick) => tick + 1)}>
        Re-render
      </button>
      <Sortable items={items.map((item) => item)} onReorder={setItems}>
        {items.map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    </>
  )
}

describe('Sortable registration', () => {
  it('keeps the monitor and each item registered across re-renders and moves', async () => {
    const user = userEvent.setup()
    render(<Columns />)
    await waitFor(() => expect(dnd.sortableDraggable).toHaveBeenCalledTimes(3))
    expect(dnd.sortableDropTarget).toHaveBeenCalledTimes(3)
    expect(dnd.sortableMonitor).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Re-render' }))
    screen.getByRole('button', { name: 'Reorder Date' }).focus()
    await user.keyboard('{Enter}')
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move Date down' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )

    expect(dnd.sortableDraggable).toHaveBeenCalledTimes(3)
    expect(dnd.sortableDropTarget).toHaveBeenCalledTimes(3)
    expect(dnd.sortableMonitor).toHaveBeenCalledTimes(1)
  })
})

describe('Sortable teardown', () => {
  it('clears the dragging state when a registration is torn down mid-drag', async () => {
    const view = (disabled: boolean) => (
      <Sortable items={['A', 'B']} onReorder={() => {}} disabled={disabled}>
        {['A', 'B'].map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
    vi.mocked(dnd.sortableDraggable).mockClear()
    const { rerender } = render(view(false))
    await waitFor(() => expect(dnd.sortableDraggable).toHaveBeenCalledTimes(2))
    const drag = vi.mocked(dnd.sortableDraggable).mock.calls[0]![0]
    act(() => drag.onDraggingChange(true))
    const item = document.querySelector('[data-slot="sortable-item"]')!
    expect(item).toHaveAttribute('data-dragging')
    rerender(view(true))
    expect(item).not.toHaveAttribute('data-dragging')
  })

  it('clears a hovered edge when its drop target is torn down', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const view = (items: string[]) => (
      <Sortable items={items} onReorder={() => {}}>
        <Sortable.Item value='A' label='A'>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    vi.mocked(dnd.sortableDropTarget).mockClear()
    const { rerender } = render(view(['A']))
    await waitFor(() => expect(dnd.sortableDropTarget).toHaveBeenCalledTimes(1))
    const target = vi.mocked(dnd.sortableDropTarget).mock.calls[0]![0]
    act(() => target.onDropEdgeChange('bottom'))
    const item = document.querySelector('[data-slot="sortable-item"]')!
    expect(item).toHaveAttribute('data-drop-edge', 'bottom')
    rerender(view([]))
    expect(item).not.toHaveAttribute('data-drop-edge')
    warn.mockRestore()
  })

  it('keeps its drop target while disabled toggles, so a hovered edge stays', async () => {
    const view = (disabled: boolean) => (
      <Sortable items={['A', 'B']} onReorder={() => {}}>
        <Sortable.Item value='A' label='A' disabled={disabled}>
          <Sortable.Handle />
        </Sortable.Item>
        <Sortable.Item value='B' label='B'>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    vi.mocked(dnd.sortableDropTarget).mockClear()
    const { rerender } = render(view(false))
    await waitFor(() => expect(dnd.sortableDropTarget).toHaveBeenCalledTimes(2))
    const target = vi.mocked(dnd.sortableDropTarget).mock.calls[0]![0]
    act(() => target.onDropEdgeChange('bottom'))
    rerender(view(true))
    rerender(view(false))
    expect(dnd.sortableDropTarget).toHaveBeenCalledTimes(2)
    expect(
      document.querySelector('[data-slot="sortable-item"]')
    ).toHaveAttribute('data-drop-edge', 'bottom')
  })
})

describe('Sortable unknown values', () => {
  it('does not register an item whose value is not in items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(dnd.sortableDropTarget).mockClear()
    render(
      <Sortable items={['A']} onReorder={() => {}}>
        {['A', 'Z'].map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
    await waitFor(() => expect(dnd.sortableDropTarget).toHaveBeenCalled())
    expect(
      vi
        .mocked(dnd.sortableDropTarget)
        .mock.calls.map(([options]) => options.value)
    ).toEqual(['A'])
    warn.mockRestore()
  })
})

describe('Sortable items without a handle', () => {
  it('takes drops but does not drag', async () => {
    vi.mocked(dnd.sortableDropTarget).mockClear()
    vi.mocked(dnd.sortableDraggable).mockClear()
    render(
      <Sortable items={['A', 'B']} onReorder={() => {}}>
        <Sortable.Item value='A' label='A' />
        <Sortable.Item value='B' label='B'>
          <Sortable.Handle />
        </Sortable.Item>
      </Sortable>
    )
    await waitFor(() => expect(dnd.sortableDraggable).toHaveBeenCalled())
    expect(
      vi
        .mocked(dnd.sortableDropTarget)
        .mock.calls.map(([options]) => options.value)
    ).toEqual(['A', 'B'])
    expect(
      vi
        .mocked(dnd.sortableDraggable)
        .mock.calls.map(([options]) => options.value)
    ).toEqual(['B'])
  })
})

describe('Sortable disabled items', () => {
  const view = (locked: string[], items = ['A', 'B']) => (
    <Sortable items={items} onReorder={onReorder}>
      {['A', 'B', 'Z'].map((value) => (
        <Sortable.Item
          key={value}
          value={value}
          label={value}
          disabled={locked.includes(value)}
        >
          <Sortable.Handle />
        </Sortable.Item>
      ))}
    </Sortable>
  )
  const onReorder = vi.fn()
  const registered = (
    mock: typeof dnd.sortableDropTarget | typeof dnd.sortableDraggable,
    value: string
  ) => vi.mocked(mock).mock.calls.some(([options]) => options.value === value)
  const isTarget = (value: string) => registered(dnd.sortableDropTarget, value)
  const clear = () => {
    vi.mocked(dnd.sortableDropTarget).mockClear()
    vi.mocked(dnd.sortableDraggable).mockClear()
  }

  it('registers a disabled item as a drop target that does not drag', async () => {
    clear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(view(['A']))
    await waitFor(() => expect(isTarget('B')).toBe(true))
    expect(registered(dnd.sortableDropTarget, 'A')).toBe(true)
    expect(registered(dnd.sortableDraggable, 'A')).toBe(false)
    expect(registered(dnd.sortableDraggable, 'B')).toBe(true)
    warn.mockRestore()
  })

  it('registers an item once its value joins items', async () => {
    clear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(view([]))
    await waitFor(() => expect(isTarget('B')).toBe(true))
    expect(isTarget('Z')).toBe(false)
    rerender(view([], ['A', 'B', 'Z']))
    await waitFor(() => expect(isTarget('Z')).toBe(true))
    warn.mockRestore()
  })

  it('ignores a drop from an item disabled mid-drag', async () => {
    vi.mocked(dnd.sortableMonitor).mockClear()
    onReorder.mockClear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(view([]))
    await waitFor(() => expect(dnd.sortableMonitor).toHaveBeenCalled())
    const { onDrop } = vi.mocked(dnd.sortableMonitor).mock.calls[0]![0]
    rerender(view(['A']))
    act(() => onDrop({ value: 'A', target: 'B', edge: 'bottom' }))
    expect(onReorder).not.toHaveBeenCalled()
    act(() => onDrop({ value: 'B', target: 'A', edge: 'top' }))
    expect(onReorder).toHaveBeenCalledWith(['B', 'A'], {
      value: 'B',
      from: 1,
      to: 0
    })
    warn.mockRestore()
  })

  it('disables the handle of an item that is not in items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(view([]))
    expect(screen.getByRole('button', { name: 'Reorder Z' })).toBeDisabled()
    warn.mockRestore()
  })
})
