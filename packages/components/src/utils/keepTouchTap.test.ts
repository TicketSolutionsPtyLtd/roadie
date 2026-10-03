import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { keepTouchTap, useHeldOpen } from './keepTouchTap'

type Details = { isCanceled: boolean; cancel: () => void; reason: string }

const detailsFor = (reason: string): Details => ({
  isCanceled: false,
  reason,
  cancel() {
    this.isCanceled = true
  }
})

function touch(element: Element, type: 'down' | 'up' | 'cancel') {
  const handlers = keepTouchTap({})
  const event = {
    pointerType: 'touch',
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    currentTarget: element,
    preventBaseUIHandler: () => {}
  } as unknown as Parameters<typeof handlers.onPointerDownCapture>[0]
  if (type === 'down') handlers.onPointerDownCapture(event)
  else if (type === 'up') handlers.onPointerUp(event)
  else handlers.onPointerCancel(event)
}

describe('useHeldOpen', () => {
  it('keeps its state when the consumer cancels the change', () => {
    const { result } = renderHook(() =>
      useHeldOpen<Details>(undefined, false, (_, details) => details.cancel())
    )
    act(() => result.current[1](true, detailsFor('input-press')))
    expect(result.current[0]).toBe(false)
  })

  it("doesn't close twice when the lift's choice already closed it", () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() =>
      useHeldOpen<Details>(undefined, true, onOpenChange)
    )
    const option = document.createElement('div')
    touch(option, 'down')
    act(() => result.current[1](false, detailsFor('focus-out')))
    // The lift's choice closes the list, then the press ends.
    option.addEventListener('click', () =>
      result.current[1](false, detailsFor('item-press'))
    )
    act(() => touch(option, 'up'))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange.mock.calls[0]![1].reason).toBe('item-press')
  })

  it('closes after a held finger lets go, as an accepted close', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() =>
      useHeldOpen<Details>(undefined, true, onOpenChange)
    )
    const option = document.createElement('div')
    touch(option, 'down')
    const details = detailsFor('escape-key')
    act(() => result.current[1](false, details))
    expect(details.isCanceled).toBe(true)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(result.current[0]).toBe(true)
    act(() => touch(option, 'cancel'))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    const [open, replayed] = onOpenChange.mock.calls[0]!
    expect(open).toBe(false)
    expect(replayed.isCanceled).toBe(false)
    expect(replayed.reason).toBe('escape-key')
    expect(result.current[0]).toBe(false)
  })
})

describe('keepTouchTap', () => {
  it('drops the mouse events a chosen tap sends after, until a new touch', () => {
    const option = document.createElement('div')
    const below = document.createElement('button')
    document.body.append(option, below)
    touch(option, 'down')
    touch(option, 'up')
    const ghost = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    })
    below.dispatchEvent(ghost)
    expect(ghost.defaultPrevented).toBe(true)
    document.dispatchEvent(new PointerEvent('pointerdown'))
    const real = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    })
    below.dispatchEvent(real)
    expect(real.defaultPrevented).toBe(false)
    option.remove()
    below.remove()
  })
})
