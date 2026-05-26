import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import { useCartDrawerDrag } from './useCartDrawerDrag'

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
})
