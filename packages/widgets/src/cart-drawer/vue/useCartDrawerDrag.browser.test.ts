import { describe, expect, it, onTestFinished } from 'vitest'
import { type Ref, createApp, defineComponent, h, nextTick, watch } from 'vue'

import { withFrames } from '@oztix/roadie-browser-testing'

import { useCartDrawerDrag } from './useCartDrawerDrag'

type Drag = ReturnType<typeof useCartDrawerDrag>

function mountDrag() {
  let drag: Drag | undefined
  const host = document.body.appendChild(document.createElement('div'))
  const app = createApp(
    defineComponent({
      setup() {
        drag = useCartDrawerDrag({ initialState: 'closed' })
        return () => h('div')
      }
    })
  )
  app.mount(host)
  onTestFinished(() => {
    app.unmount()
    host.remove()
  })
  return drag!
}

function box(height: number) {
  const element = document.body.appendChild(document.createElement('div'))
  element.style.height = `${height}px`
  onTestFinished(() => element.remove())
  return element
}

// Runs `during` inside the next report about `element` from an observer made
// now. Observers report in the order they were made, so the drawer's own
// observer of the same element has already reported in this update.
const duringNextReport = (element: Element, during: () => void) =>
  withFrames(
    () =>
      new Promise<void>((done) => {
        const probe = new ResizeObserver(() => {
          probe.disconnect()
          during()
          done()
        })
        probe.observe(element)
      })
  )

// The drawer writes in a frame callback, so one more frame has run it.
const nextFrame = () =>
  withFrames(async () => {
    await new Promise(requestAnimationFrame)
    await nextTick()
  })

// Every value written, as a later write can cover a wrong one within a frame.
function writesTo(height: Ref<number>) {
  const writes: number[] = []
  onTestFinished(
    watch(height, (value) => writes.push(value), { flush: 'sync' })
  )
  return writes
}

describe('useCartDrawerDrag height tracking', () => {
  it.each([
    ['header', 'setHeaderElement', 'headerHeight'],
    ['footer', 'setFooterElement', 'footerHeight']
  ] as const)(
    'writes a resized %s’s height a frame after its observer reports, not in the report',
    async (_, setElement, height) => {
      const drag = mountDrag()
      const element = box(40)
      drag[setElement](element)
      expect(drag[height].value).toBe(40)

      element.style.height = '80px'
      let inReport = 0
      await duringNextReport(element, () => (inReport = drag[height].value))
      // A write inside the report is what trips the "ResizeObserver loop" warning.
      expect(inReport).toBe(40)

      await nextFrame()
      expect(drag[height].value).toBe(80)
    }
  )

  it('drops a pending header write when the drawer opens before it lands', async () => {
    const drag = mountDrag()
    const header = box(40)
    drag.setHeaderElement(header)
    const writes = writesTo(drag.headerHeight)

    header.style.height = '80px'
    // Open, an observation would inflate the docked height.
    await duringNextReport(header, () => drag.setState('open'))
    await nextFrame()
    await nextFrame()

    expect(writes).toEqual([])
  })

  it('drops a pending header write when a new header element is set', async () => {
    const drag = mountDrag()
    const header = box(40)
    drag.setHeaderElement(header)
    const writes = writesTo(drag.headerHeight)

    header.style.height = '80px'
    await duringNextReport(header, () => drag.setHeaderElement(box(55)))
    await nextFrame()
    await nextFrame()

    expect(writes).toEqual([55])
  })
})
