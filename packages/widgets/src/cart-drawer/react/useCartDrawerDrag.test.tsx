import { type PointerEvent as ReactPointerEvent } from 'react'

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

  it('detaches window drag listeners when unmounted mid-drag', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { result, unmount } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )
    act(() => result.current.handleDragStart(dragStartEvent(500, 1)))
    expect(result.current.isDragging).toBe(true)

    unmount()
    // pointermove is only ever removed by the drag cleanup — proves the
    // in-flight listeners were detached rather than leaked.
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    removeSpy.mockRestore()
  })
})
