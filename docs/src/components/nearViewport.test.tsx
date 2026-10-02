// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNearViewport } from './nearViewport'

let report: IntersectionObserverCallback

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })
  globalThis.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      report = callback
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** An example whose first render never reports, like one stuck on its chunk. */
function Example({ ready }: { ready: () => Promise<unknown> }) {
  const [ref, near] = useNearViewport<HTMLDivElement>(false, ready)
  return <div ref={ref} data-near={near} />
}

function bringIntoReach(container: HTMLElement) {
  const entries = [...container.querySelectorAll('[data-near]')].map(
    (target) => ({ target, isIntersecting: true })
  )
  act(() => report(entries as IntersectionObserverEntry[], {} as never))
}

const nearCount = (container: HTMLElement) =>
  container.querySelectorAll('[data-near=true]').length

describe('useNearViewport', () => {
  it('holds the queue while the runner chunk loads, then times out a stuck mount', async () => {
    let loaded!: () => void
    const chunk = new Promise<void>((resolve) => (loaded = resolve))
    const ready = () => chunk
    const { container } = render(
      <>
        <Example ready={ready} />
        <Example ready={ready} />
      </>
    )

    bringIntoReach(container)
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(nearCount(container)).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(nearCount(container)).toBe(1)

    await act(async () => loaded())
    await act(() => vi.advanceTimersByTimeAsync(2100))
    expect(nearCount(container)).toBe(2)
  })

  it('frees the queue when the runner chunk fails to load', async () => {
    const ready = () => Promise.reject(new Error('chunk failed'))
    const { container } = render(
      <>
        <Example ready={ready} />
        <Example ready={ready} />
      </>
    )

    bringIntoReach(container)
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(nearCount(container)).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(50))
    expect(nearCount(container)).toBe(2)
  })
})
