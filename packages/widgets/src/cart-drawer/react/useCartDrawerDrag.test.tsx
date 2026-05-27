import { type PointerEvent as ReactPointerEvent } from 'react'

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCartDrawerDrag } from './useCartDrawerDrag'

function dragStartEvent(clientY: number, pointerId: number): ReactPointerEvent {
  return { clientY, pointerId } as unknown as ReactPointerEvent
}

function dispatchPointer(
  type: 'pointermove' | 'pointerup' | 'pointercancel',
  clientY: number,
  pointerId: number
): void {
  const e = new Event(type)
  Object.assign(e, { clientY, pointerId })
  window.dispatchEvent(e)
}

describe('useCartDrawerDrag', () => {
  it('starts in the initial state', () => {
    const { result } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )
    expect(result.current.state).toBe('closed')
  })

  it('toggle flips the state', () => {
    const { result } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )
    act(() => result.current.toggle())
    expect(result.current.state).toBe('open')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('closed')
  })

  it('setState sets the state directly', () => {
    const { result } = renderHook(() => useCartDrawerDrag())
    act(() => result.current.setState('open'))
    expect(result.current.state).toBe('open')
  })

  it('exposes measured header/footer defaults', () => {
    const { result } = renderHook(() => useCartDrawerDrag())
    expect(result.current.headerHeight).toBeGreaterThan(0)
    expect(result.current.footerHeight).toBeGreaterThan(0)
  })

  it('ignores pointer events from a different pointerId and refuses re-entry', () => {
    const { result } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )

    act(() => result.current.handleDragStart(dragStartEvent(500, 1)))
    expect(result.current.isDragging).toBe(true)

    // A second finger starting a drag must not hijack the active pointer.
    act(() => result.current.handleDragStart(dragStartEvent(450, 2)))

    // A foreign pointer releasing must not end the in-progress drag.
    act(() => dispatchPointer('pointerup', 400, 2))
    expect(result.current.isDragging).toBe(true)

    // The original pointer releasing ends it.
    act(() => dispatchPointer('pointerup', 400, 1))
    expect(result.current.isDragging).toBe(false)
  })
})
