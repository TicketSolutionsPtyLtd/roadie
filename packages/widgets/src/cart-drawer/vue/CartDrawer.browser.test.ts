import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'

import { withFrames } from '@oztix/roadie-browser-testing'

import { cartClient, describeDrawerGeometry } from '../drawerTestUtils'
import CartDrawer from './CartDrawer.vue'

// @testing-library/vue reads `process.env`, which a browser doesn't have.
describeDrawerGeometry('Vue', (props) => {
  const host = document.body.appendChild(document.createElement('div'))
  const app = createApp(CartDrawer, props)
  app.mount(host)
  return () => {
    app.unmount()
    host.remove()
  }
})

describe('Vue CartDrawer header and footer', () => {
  // Vue calls a function ref on every render. Re-observing the same element
  // each time makes the observer report, its write render again, and the tab
  // freeze one render per frame.
  it('observes them once, not again on every render', async () => {
    const observe = vi.spyOn(ResizeObserver.prototype, 'observe')
    onTestFinished(() => observe.mockRestore())
    const refreshKey = ref(0)
    const host = document.body.appendChild(document.createElement('div'))
    const app = createApp({
      render: () =>
        h(CartDrawer, {
          cart: cartClient(),
          collectionId: 'col-1',
          onNavigate: () => {},
          locale: 'en-AU',
          currency: 'AUD',
          refreshKey: refreshKey.value
        })
    })
    app.mount(host)
    onTestFinished(() => {
      app.unmount()
      host.remove()
    })

    const body = await vi.waitUntil(() =>
      document.getElementById('cart-drawer-body')
    )
    const parts = [
      body.parentElement!.previousElementSibling,
      body.parentElement!.nextElementSibling
    ]
    const observed = () =>
      observe.mock.calls.filter(([target]) => parts.includes(target)).length
    await expect.poll(observed).toBe(2)

    for (let key = 1; key <= 5; key++) {
      refreshKey.value = key
      await nextTick()
      await withFrames(() => new Promise(requestAnimationFrame))
    }

    expect(observed()).toBe(2)
  })
})
