import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
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

  it('progress is 0 when closed and 1 when open', async () => {
    const drag = mountDrag('closed')
    expect(drag.progress.value).toBe(0)
    drag.toggle()
    await nextTick()
    expect(drag.progress.value).toBe(1)
  })

  it('setState forces a target state', async () => {
    const drag = mountDrag('closed')
    drag.setState('open')
    await nextTick()
    expect(drag.state.value).toBe('open')
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
})
