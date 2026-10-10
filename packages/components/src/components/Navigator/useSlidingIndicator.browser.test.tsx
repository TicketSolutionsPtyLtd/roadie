import { type RefObject, createRef } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  type SlidingIndicatorState,
  useSlidingIndicator
} from './useSlidingIndicator'

type HarnessProps = {
  trackRef: RefObject<HTMLDivElement | null>
  intent?: string
  states: SlidingIndicatorState[]
}

function Harness({ trackRef, intent = 'first', states }: HarnessProps) {
  states.push(useSlidingIndicator(trackRef, intent))
  return null
}

// The observers report once on observe; a change before then reads as the first box.
const observed = () =>
  new Promise((settle) =>
    requestAnimationFrame(() => requestAnimationFrame(settle))
  )

let detach = () => {}
afterEach(() => {
  cleanup()
  detach()
})

const place = (
  element: HTMLElement,
  box: { left: number; top: number; width: number; height: number }
) =>
  Object.assign(element.style, {
    position: 'absolute',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`
  })

/** A 300 by 60 track with two 80 by 50 destinations, 10px and 100px in. */
function setup({ track: trackStyle = {} } = {}) {
  const trackRef = createRef<HTMLDivElement>()
  const track = document.createElement('div')
  Object.assign(track.style, {
    position: 'relative',
    width: '300px',
    height: '60px',
    overflow: 'auto',
    scrollbarWidth: 'none',
    ...trackStyle
  })
  const destinationAt = (left: number) => {
    const destination = document.createElement('a')
    destination.dataset.slot = 'navigator-item'
    place(destination, { left, top: 5, width: 80, height: 50 })
    track.append(destination)
    return destination
  }
  const first = destinationAt(10)
  const second = destinationAt(100)
  document.body.append(track)
  detach = () => track.remove()
  ;(trackRef as { current: HTMLDivElement | null }).current = track

  const states: SlidingIndicatorState[] = []
  const harness = (intent?: string) => (
    <Harness trackRef={trackRef} intent={intent} states={states} />
  )
  const last = () => states.at(-1)!
  return { track, first, second, states, harness, last }
}

const current = (on: HTMLElement, off?: HTMLElement) => {
  on.dataset.current = ''
  if (off) delete off.dataset.current
}

describe('the sliding indicator', () => {
  it.each([
    ['laid out in the track', {}, () => {}, ['100px', '5px', '120px', '80px']],
    [
      'in a scrolled track, in content space',
      {},
      (track: HTMLElement) => {
        const spacer = document.createElement('div')
        place(spacer, { left: 0, top: 0, width: 600, height: 120 })
        track.append(spacer)
        track.scrollTo(40, 12)
      },
      ['100px', '5px', '120px', '80px']
    ],
    [
      'in a scrolled track its offsets can’t reach',
      { position: 'static' },
      (track: HTMLElement) => {
        // Positioned, but not the track: offsetParent walks past it.
        const content = document.createElement('div')
        Object.assign(content.style, {
          position: 'relative',
          width: '600px',
          height: '120px'
        })
        content.append(...track.children)
        track.append(content)
        track.scrollTo(40, 12)
      },
      ['100px', '5px', '120px', '80px']
    ],
    [
      'inside a positioned wrapper',
      {},
      (track: HTMLElement, second: HTMLElement) => {
        const wrapper = document.createElement('div')
        place(wrapper, { left: 145, top: 4, width: 150, height: 56 })
        track.append(wrapper)
        wrapper.append(second)
        place(second, { left: 30, top: 4, width: 82, height: 50 })
      },
      ['175px', '8px', '43px', '82px']
    ]
  ])(
    'publishes the current destination’s box %s',
    (_, trackStyle, arrange, [left, top, right, width]) => {
      const { track, second, harness, last } = setup({ track: trackStyle })
      arrange(track, second)
      current(second)

      render(harness())

      expect(last().ready).toBe(true)
      expect(last().style).toMatchObject({
        '--active-tab-left': left,
        '--active-tab-top': top,
        '--active-tab-right': right,
        '--active-tab-width': width,
        '--active-tab-height': '50px'
      })
    }
  )

  it.each([
    ['nothing is current', () => {}],
    [
      'the current destination has no size',
      (first: HTMLElement) => {
        current(first)
        first.style.width = '0px'
      }
    ]
  ])('is not ready when %s', (_, arrange) => {
    const { first, harness, last } = setup()
    arrange(first)

    render(harness())

    expect(last().ready).toBe(false)
  })

  it('keeps the last box while unready, so the pill fades out in place', () => {
    const { second, harness, last } = setup()
    current(second)
    const { rerender } = render(harness())
    const box = last().style

    delete second.dataset.current
    rerender(harness())

    expect(last()).toMatchObject({ ready: false, settled: false })
    expect(last().style).toEqual(box)
  })

  it('settles only after the first box commits, each time the pill appears', () => {
    const { first, second, states, harness, last } = setup()
    const { rerender } = render(harness())
    const firstReady = () => states.find((state) => state.ready)!

    current(first)
    rerender(harness())
    expect(firstReady()).toMatchObject({ settled: false })
    expect(firstReady().style).toMatchObject({ '--active-tab-left': '10px' })
    expect(last()).toMatchObject({ ready: true, settled: true })

    delete first.dataset.current
    rerender(harness())
    expect(last()).toMatchObject({ ready: false, settled: false })

    states.length = 0
    current(second)
    rerender(harness())
    expect(firstReady()).toMatchObject({ settled: false })
    expect(firstReady().style).toMatchObject({ '--active-tab-left': '100px' })
    expect(last()).toMatchObject({ ready: true, settled: true })
  })

  it('slides to a destination it was asked for', () => {
    const { first, second, states, harness, last } = setup()
    current(first)
    const { rerender } = render(harness('first'))
    expect(last()).toMatchObject({ ready: true, settled: true })

    states.length = 0
    current(second, first)
    rerender(harness('second'))

    expect(states.every((state) => state.settled)).toBe(true)
    expect(last().style).toMatchObject({ '--active-tab-left': '100px' })
  })

  it('snaps to a destination that resizes in place, then slides to the next one asked for', async () => {
    const { first, second, harness, last } = setup()
    current(first)
    const { rerender } = render(harness('first'))
    expect(last()).toMatchObject({ ready: true, settled: true })
    await observed()

    first.style.width = '160px'

    await expect
      .poll(() => last().style)
      .toMatchObject({ '--active-tab-width': '160px' })
    expect(last()).toMatchObject({ ready: true, settled: false })

    current(second, first)
    rerender(harness('second'))
    expect(last()).toMatchObject({ ready: true, settled: true })
  })

  it('snaps to a destination it wasn’t asked for, as when one folds into More', async () => {
    const { track, first, second, harness, last } = setup()
    current(first)
    render(harness('first'))
    await observed()

    current(second, first)
    track.style.width = '280px'

    await expect
      .poll(() => last().style)
      .toMatchObject({ '--active-tab-left': '100px' })
    expect(last()).toMatchObject({ ready: true, settled: false })
  })

  it('holds its box while a transform moves the destination but its layout stays put', async () => {
    const { track, second, harness, last } = setup()
    current(second)
    render(harness())
    const laidOut = last().style
    await observed()

    second.style.transform = 'translate(4px, 6px) scale(0.7)'
    track.style.width = '290px'

    await expect
      .poll(() => last().style)
      .toMatchObject({ '--active-tab-right': '110px' })
    expect(last().style).toMatchObject({
      ...laidOut,
      '--active-tab-right': '110px'
    })
  })
})
