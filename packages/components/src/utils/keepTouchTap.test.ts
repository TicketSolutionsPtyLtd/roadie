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

function touch(element: Element, type: 'down' | 'cancel') {
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
  else handlers.onPointerCancel(event)
}

describe('useHeldOpen', () => {
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
