import { type RefObject, createRef } from 'react'

// The hook tracks `data-current` — visual currency — not `aria-current`.
// The two part on one case: a secondary on a sub-route it never declared
// holds the pill while the exact page keeps the announcement.

import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useSlidingIndicator } from './useSlidingIndicator'

/**
 * jsdom reports every rect as zero, so geometry has to be stubbed. Values are
 * viewport-space, matching what getBoundingClientRect would really return.
 */
const stubRect = (
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number }
) => {
  element.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({})
    }) as DOMRect
}

/**
 * jsdom has no layout: `offsetParent` is always null and every offset is 0, so
 * the layout path has to be stubbed as deliberately as the rect one. Stubbing
 * `offsetParent` is what makes the hook treat `track` as the measurement
 * origin instead of falling back to rects.
 */
const stubLayout = (
  element: HTMLElement,
  track: HTMLElement,
  box: { left: number; top: number; width: number; height: number }
) => {
  for (const [property, value] of [
    ['offsetLeft', box.left],
    ['offsetTop', box.top],
    ['offsetWidth', box.width],
    ['offsetHeight', box.height]
  ] as const) {
    Object.defineProperty(element, property, { value, configurable: true })
  }
  Object.defineProperty(element, 'offsetParent', {
    value: track,
    configurable: true
  })
}

type HarnessState = {
  style?: Record<string, string>
  ready: boolean
  settled: boolean
}

type HarnessProps = {
  trackRef: RefObject<HTMLDivElement | null>
  intent?: string
  onState?: (state: HarnessState) => void
}

function Harness({ trackRef, intent = 'initial', onState }: HarnessProps) {
  const state = useSlidingIndicator(trackRef, intent)
  onState?.(state as never)
  return null
}

const setup = () => {
  const trackRef = createRef<HTMLDivElement>()
  const track = document.createElement('div')
  const first = document.createElement('a')
  const second = document.createElement('a')

  for (const child of [first, second]) {
    child.setAttribute('data-slot', 'navigator-item')
    track.append(child)
  }
  document.body.append(track)
  ;(trackRef as { current: HTMLDivElement | null }).current =
    track as HTMLDivElement

  stubRect(track, { left: 100, top: 50, width: 300, height: 60 })
  stubRect(first, { left: 110, top: 55, width: 80, height: 50 })
  stubRect(second, { left: 200, top: 55, width: 80, height: 50 })

  return { trackRef, track, first, second }
}

// Nothing here stubs offsets, so jsdom's null `offsetParent` puts every case
// below on the hook's rect fallback — which is what these pin. The layout path
// it normally takes has its own describe at the foot of the file.
describe('useSlidingIndicator rect fallback', () => {
  it('publishes the active element geometry relative to the track', () => {
    const { trackRef, second } = setup()
    second.setAttribute('data-current', '')

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(true)
    expect(captured.style).toMatchObject({
      '--active-tab-left': '100px',
      '--active-tab-top': '5px',
      '--active-tab-width': '80px',
      '--active-tab-height': '50px'
    })
  })

  it('adds the track scroll offset so a scrolled track still lines up', () => {
    const { trackRef, track, second } = setup()
    second.setAttribute('data-current', '')
    Object.defineProperty(track, 'scrollLeft', { value: 40, writable: true })
    Object.defineProperty(track, 'scrollTop', { value: 12, writable: true })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.style).toMatchObject({
      '--active-tab-left': '140px',
      '--active-tab-top': '17px'
    })
  })

  it('is not ready when nothing is current', () => {
    const { trackRef } = setup()

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(false)
    expect(captured.style).toBeUndefined()
  })

  it('is not ready when the active element has zero size', () => {
    const { trackRef, first } = setup()
    first.setAttribute('data-current', '')
    stubRect(first, { left: 110, top: 55, width: 0, height: 0 })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(false)
  })

  it('keeps the last box while unready, so the pill fades out in place', () => {
    const { trackRef, second } = setup()
    second.setAttribute('data-current', '')
    const states: HarnessState[] = []
    const { rerender } = render(
      <Harness trackRef={trackRef} onState={(state) => states.push(state)} />
    )
    const box = states.at(-1)!.style

    second.removeAttribute('data-current')
    rerender(
      <Harness trackRef={trackRef} onState={(state) => states.push(state)} />
    )

    expect(states.at(-1)).toMatchObject({ ready: false, settled: false })
    expect(states.at(-1)!.style).toEqual(box)
  })

  it('settles only after the first box commits, each time the pill appears', () => {
    const { trackRef, first, second } = setup()
    const states: HarnessState[] = []
    const harness = () => (
      <Harness trackRef={trackRef} onState={(state) => states.push(state)} />
    )
    const { rerender } = render(harness())
    const firstReady = () => states.find((state) => state.ready)!

    first.setAttribute('data-current', '')
    rerender(harness())
    expect(firstReady()).toMatchObject({ settled: false })
    expect(firstReady().style).toMatchObject({ '--active-tab-left': '10px' })
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })

    first.removeAttribute('data-current')
    rerender(harness())
    expect(states.at(-1)).toMatchObject({ ready: false, settled: false })

    states.length = 0
    second.setAttribute('data-current', '')
    rerender(harness())
    expect(firstReady()).toMatchObject({ settled: false })
    expect(firstReady().style).toMatchObject({ '--active-tab-left': '100px' })
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })
  })

  it('stays settled while the pill moves within its track', () => {
    const { trackRef, first, second } = setup()
    first.setAttribute('data-current', '')
    const states: HarnessState[] = []
    const harness = (intent = 'first') => (
      <Harness
        trackRef={trackRef}
        intent={intent}
        onState={(state) => states.push(state)}
      />
    )
    const { rerender } = render(harness())
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })

    states.length = 0
    first.removeAttribute('data-current')
    second.setAttribute('data-current', '')
    rerender(harness('second'))
    expect(states.every((state) => state.settled)).toBe(true)
    expect(states.at(-1)!.style).toMatchObject({ '--active-tab-left': '100px' })
  })
})

class StubResizeObserver implements ResizeObserver {
  static instances: StubResizeObserver[] = []
  observed = new Set<Element>()

  constructor(
    private readonly callback: (
      entries: ResizeObserverEntry[],
      observer: ResizeObserver
    ) => void
  ) {
    StubResizeObserver.instances.push(this)
  }

  observe(target: Element) {
    this.observed.add(target)
  }

  unobserve(target: Element) {
    this.observed.delete(target)
  }

  disconnect() {
    this.observed.clear()
  }

  trigger() {
    this.callback([], this)
  }
}

describe('useSlidingIndicator ResizeObserver integration', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    StubResizeObserver.instances = []
    globalThis.ResizeObserver = originalResizeObserver
  })

  it('observes the track and every destination', () => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver
    const { trackRef, track, first, second } = setup()
    first.setAttribute('data-current', '')

    render(<Harness trackRef={trackRef} />)

    expect(StubResizeObserver.instances).toHaveLength(1)
    const observed = StubResizeObserver.instances[0]!.observed
    expect(observed).toEqual(new Set([track, first, second]))
  })

  it('re-measures when the observer callback fires', () => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver
    const { trackRef, second } = setup()
    second.setAttribute('data-current', '')

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.style).toMatchObject({
      '--active-tab-left': '100px',
      '--active-tab-width': '80px'
    })

    stubRect(second, { left: 220, top: 55, width: 120, height: 50 })
    act(() => {
      StubResizeObserver.instances[0]!.trigger()
    })

    expect(captured.style).toMatchObject({
      '--active-tab-left': '120px',
      '--active-tab-width': '120px'
    })
  })

  it('snaps a destination that resizes in place and slides to a new one', () => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver
    const { trackRef, first, second } = setup()
    first.setAttribute('data-current', '')
    const states: HarnessState[] = []
    const harness = (intent = 'first') => (
      <Harness
        trackRef={trackRef}
        intent={intent}
        onState={(state) => states.push(state)}
      />
    )
    const { rerender } = render(harness())
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })

    stubRect(first, { left: 110, top: 55, width: 160, height: 50 })
    act(() => {
      StubResizeObserver.instances[0]!.trigger()
    })
    expect(states.at(-1)).toMatchObject({ ready: true, settled: false })
    expect(states.at(-1)!.style).toMatchObject({
      '--active-tab-width': '160px'
    })

    first.removeAttribute('data-current')
    second.setAttribute('data-current', '')
    rerender(harness('second'))
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })
  })

  it('snaps to a new destination the user did not ask for, e.g. a fold into More', () => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver
    const { trackRef, first, second } = setup()
    first.setAttribute('data-current', '')
    const states: HarnessState[] = []
    const harness = (intent = 'first') => (
      <Harness
        trackRef={trackRef}
        intent={intent}
        onState={(state) => states.push(state)}
      />
    )
    const { rerender } = render(harness())
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })

    first.removeAttribute('data-current')
    second.setAttribute('data-current', '')
    act(() => {
      StubResizeObserver.instances[0]!.trigger()
    })
    expect(states.at(-1)).toMatchObject({ ready: true, settled: false })
    expect(states.at(-1)!.style).toMatchObject({ '--active-tab-left': '100px' })

    second.removeAttribute('data-current')
    first.setAttribute('data-current', '')
    rerender(harness())
    expect(states.at(-1)).toMatchObject({ ready: true, settled: false })

    second.setAttribute('data-current', '')
    first.removeAttribute('data-current')
    rerender(harness('second'))
    expect(states.at(-1)).toMatchObject({ ready: true, settled: true })
  })

  it('publishes the right inset so a pill can follow its track in CSS', () => {
    const { trackRef, track, second } = setup()
    Object.defineProperty(track, 'clientWidth', { value: 300 })
    second.setAttribute('data-current', '')
    let captured: HarnessState = { ready: false, settled: false }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )
    expect(captured.style).toMatchObject({ '--active-tab-right': '120px' })
  })
})

describe('useSlidingIndicator layout measurement', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    StubResizeObserver.instances = []
    globalThis.ResizeObserver = originalResizeObserver
  })

  // The tab bar's collapse animates its tabs on `translate`/`scale` alone, so
  // the active tab's rect reports wherever the transition currently has it
  // while its layout box never moves. Sampling the rect published the
  // travelling circle's position — a full column left of the tab — and nothing
  // corrected it once the bar expanded again.
  it('holds its geometry across a collapse/expand cycle that only moves rects', () => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver
    const { trackRef, track, second } = setup()
    second.setAttribute('data-current', '')
    stubLayout(second, track, { left: 100, top: 5, width: 80, height: 50 })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )
    const expanded = captured.style
    expect(expanded).toMatchObject({
      '--active-tab-left': '100px',
      '--active-tab-top': '5px',
      '--active-tab-width': '80px',
      '--active-tab-height': '50px'
    })

    // Collapsed: the tab is a 56px circle translated to the bar's left edge.
    stubRect(second, { left: 104, top: 61, width: 56, height: 56 })
    act(() => {
      StubResizeObserver.instances[0]!.trigger()
    })
    expect(captured.style).toEqual(expanded)

    // Expanded again, sampled before the transition has unwound — the rect
    // still lags behind the layout box it is animating back to.
    stubRect(second, { left: 150, top: 58, width: 70, height: 52 })
    act(() => {
      StubResizeObserver.instances[0]!.trigger()
    })
    expect(captured.style).toEqual(expanded)
  })

  it('reads offsets in content space, so track scroll is not added twice', () => {
    const { trackRef, track, second } = setup()
    second.setAttribute('data-current', '')
    stubLayout(second, track, { left: 205, top: 21, width: 82, height: 52 })
    Object.defineProperty(track, 'scrollLeft', { value: 40, writable: true })
    Object.defineProperty(track, 'scrollTop', { value: 12, writable: true })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.style).toMatchObject({
      '--active-tab-left': '205px',
      '--active-tab-top': '21px',
      '--active-tab-width': '82px',
      '--active-tab-height': '52px'
    })
  })

  it('accumulates offsets through a positioned wrapper up to the track', () => {
    const { trackRef, track, second } = setup()
    const wrapper = document.createElement('div')
    track.append(wrapper)
    wrapper.append(second)
    second.setAttribute('data-current', '')
    stubLayout(second, wrapper, { left: 30, top: 4, width: 82, height: 52 })
    stubLayout(wrapper, track, { left: 145, top: 5, width: 300, height: 60 })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.style).toMatchObject({
      '--active-tab-left': '175px',
      '--active-tab-top': '9px'
    })
  })
})
