/* eslint-disable no-undef -- type-only DOM names like ResizeObserverCallback
   are not runtime globals, so no-undef false-positives on them; TypeScript
   already checks undefined references. */
import { render } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  describe('ResizeObserver write deferral', () => {
    let observerCallbacks: ResizeObserverCallback[] = []
    let originalRO: typeof ResizeObserver | undefined

    function stubElement(height: number): HTMLElement {
      const el = document.createElement('div')
      Object.defineProperty(el, 'getBoundingClientRect', {
        value: () => ({
          height,
          width: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          x: 0,
          y: 0
        })
      })
      return el
    }

    function fireResize(
      cb: ResizeObserverCallback,
      target: HTMLElement,
      height: number
    ): void {
      const entry = {
        target,
        borderBoxSize: [{ blockSize: height, inlineSize: 0 }],
        contentBoxSize: [{ blockSize: height, inlineSize: 0 }],
        devicePixelContentBoxSize: [],
        contentRect: { height } as DOMRectReadOnly
      } as unknown as ResizeObserverEntry
      cb([entry], {} as ResizeObserver)
    }

    beforeEach(() => {
      observerCallbacks = []
      originalRO = (
        globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }
      ).ResizeObserver
      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          observerCallbacks.push(cb)
        }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
      ;(
        globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
      ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
    })

    afterEach(() => {
      ;(
        globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }
      ).ResizeObserver = originalRO
    })

    it('defers header height writes from inside the RO callback past the current frame', async () => {
      const drag = mountDrag('closed')
      const el = stubElement(40)
      drag.setHeaderElement(el)
      expect(drag.headerHeight.value).toBe(40)
      expect(observerCallbacks).toHaveLength(1)

      fireResize(observerCallbacks[0]!, el, 80)

      // The synchronous write is the one that trips the RO loop warning.
      expect(drag.headerHeight.value).toBe(40)

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      await nextTick()
      expect(drag.headerHeight.value).toBe(80)
    })

    it('defers footer height writes from inside the RO callback past the current frame', async () => {
      const drag = mountDrag('closed')
      const el = stubElement(50)
      drag.setFooterElement(el)
      expect(drag.footerHeight.value).toBe(50)
      expect(observerCallbacks).toHaveLength(1)

      fireResize(observerCallbacks[0]!, el, 90)
      expect(drag.footerHeight.value).toBe(50)

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      await nextTick()
      expect(drag.footerHeight.value).toBe(90)
    })

    it('skips a deferred header write if the drawer starts opening before the rAF tick', async () => {
      const drag = mountDrag('closed')
      const el = stubElement(40)
      drag.setHeaderElement(el)
      expect(drag.headerHeight.value).toBe(40)

      fireResize(observerCallbacks[0]!, el, 80)

      // Once `progress` hits 1, an observation taken mid-open would inflate
      // the docked height, so the deferred write must be dropped.
      drag.setState('open')
      await nextTick()

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      await nextTick()
      expect(drag.headerHeight.value).toBe(40)
    })

    it('cancels a pending header write when setHeaderElement is called with a new element', async () => {
      const drag = mountDrag('closed')
      const el1 = stubElement(40)
      drag.setHeaderElement(el1)
      fireResize(observerCallbacks[0]!, el1, 80)

      const el2 = stubElement(55)
      drag.setHeaderElement(el2)
      expect(drag.headerHeight.value).toBe(55)

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      await nextTick()
      expect(drag.headerHeight.value).toBe(55)
    })
  })

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
    // pointermove is only ever removed by the drag cleanup — proves the
    // in-flight listeners were detached rather than leaked.
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    removeSpy.mockRestore()
  })
})
