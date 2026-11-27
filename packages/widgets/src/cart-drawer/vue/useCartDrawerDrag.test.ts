import { render } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import { useCartDrawerDrag } from './useCartDrawerDrag'

function dragStartEvent(clientY: number, pointerId: number): PointerEvent {
  return { clientY, pointerId } as unknown as PointerEvent
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

// Spin rAF/microtasks until a spring-driven value reaches its target (or a
// frame budget elapses), so tests assert settled state without a fixed sleep.
async function settle(
  get: () => number,
  target: number,
  maxFrames = 120
): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (Math.abs(get() - target) <= 0.001) return
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await nextTick()
  }
}

function mountDrag(initialState: 'open' | 'closed' = 'closed') {
  const result: { value: ReturnType<typeof useCartDrawerDrag> | null } = {
    value: null
  }
  const Comp = defineComponent({
    setup() {
      result.value = useCartDrawerDrag({ initialState })
      return () => h('div')
    }
  })
  render(Comp)
  return result.value!
}

describe('useCartDrawerDrag', () => {
  it('starts closed and toggles open/closed', async () => {
    const drag = mountDrag('closed')
    expect(drag.state.value).toBe('closed')
    drag.toggle()
    await nextTick()
    expect(drag.state.value).toBe('open')
    drag.toggle()
    await nextTick()
    expect(drag.state.value).toBe('closed')
  })

  it('honours an open initial state', () => {
    const drag = mountDrag('open')
    expect(drag.state.value).toBe('open')
  })

  it('progress is 0 when closed and springs to 1 when opened', async () => {
    const drag = mountDrag('closed')
    expect(drag.progress.value).toBe(0)
    drag.toggle()
    // Height now springs (motion `animate`) instead of snapping, so progress
    // ramps toward 1 over several frames rather than jumping in one tick.
    await settle(() => drag.progress.value, 1)
    expect(drag.progress.value).toBeGreaterThan(0.99)
  })

  it('exposes a positive closed height from measured header + footer', () => {
    const drag = mountDrag('closed')
    expect(drag.closedHeight.value).toBeGreaterThan(0)
  })

  it('ignores pointer events from a different pointerId and refuses re-entry', () => {
    const drag = mountDrag('closed')

    drag.handleDragStart(dragStartEvent(500, 1))
    expect(drag.isDragging.value).toBe(true)

    // A second finger must not hijack the active pointer.
    drag.handleDragStart(dragStartEvent(450, 2))

    // A foreign pointer releasing must not end the in-progress drag.
    dispatchPointer('pointerup', 400, 2)
    expect(drag.isDragging.value).toBe(true)

    // The original pointer releasing ends it.
    dispatchPointer('pointerup', 400, 1)
    expect(drag.isDragging.value).toBe(false)
  })

  // Height tracking needs a real ResizeObserver: useCartDrawerDrag.browser.test.ts.

  it('detaches window drag listeners when unmounted mid-drag', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const result: { value: ReturnType<typeof useCartDrawerDrag> | null } = {
      value: null
    }
    const Comp = defineComponent({
      setup() {
        result.value = useCartDrawerDrag({ initialState: 'closed' })
        return () => h('div')
      }
    })
    const { unmount } = render(Comp)
    result.value?.handleDragStart(dragStartEvent(500, 1))
    expect(result.value?.isDragging.value).toBe(true)

    unmount()
    // pointermove is only ever removed by the drag cleanup, proving the
    // in-flight listeners were detached rather than leaked.
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    removeSpy.mockRestore()
  })
})
