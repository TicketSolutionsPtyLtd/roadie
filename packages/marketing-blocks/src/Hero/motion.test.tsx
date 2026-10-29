import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { pageHero } from './fixtures'

const observers = new Set<IntersectionObserverCallback>()

// Every observer sees the block arrive, as one viewport would show it.
function intersect(isIntersecting: boolean) {
  for (const callback of observers)
    callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
}

class OnScreenObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {
    observers.add(this.callback)
  }
  disconnect() {
    observers.delete(this.callback)
  }
}

const motionListeners = new Set<() => void>()
let reduced = false

function reduceMotion(reduce: boolean) {
  reduced = reduce
  for (const listener of motionListeners) listener()
}

function stubMatchMedia() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        get matches() {
          return reduced && query.includes('reduce')
        },
        addEventListener: (_: string, listener: () => void) =>
          motionListeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          motionListeners.delete(listener)
      }) as unknown as MediaQueryList
  )
}

const shown = (name: string) => screen.queryByRole('img', { name })

describe('Hero photo cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', OnScreenObserver)
    stubMatchMedia()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    observers.clear()
    motionListeners.clear()
    reduced = false
  })

  it('moves to the next people photo every four seconds while on screen', () => {
    reduceMotion(false)
    render(<Hero {...pageHero()} eventImages={[]} />)
    act(() => intersect(true))

    act(() => vi.advanceTimersByTime(3999))
    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(shown('The Oztix team at Antler Kettle Hall')).toBeNull()
    expect(shown('Event crew waving at Jumbuck Orchard Park')).not.toBeNull()

    act(() => vi.advanceTimersByTime(4000))
    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
  })

  it('holds still off screen', () => {
    reduceMotion(false)
    render(<Hero {...pageHero()} />)

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
  })

  it('holds the first photos, and pauses the video, for viewers who reduce motion', () => {
    reduceMotion(true)
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})
    const { container } = render(<Hero {...pageHero()} />)
    act(() => intersect(true))

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot=hero-people] img')
    ).toHaveLength(1)
    expect(pause).toHaveBeenCalled()
  })

  it('shows the first photos again when the viewer turns on reduced motion mid-cycle', () => {
    render(<Hero {...pageHero()} eventImages={[]} />)
    act(() => intersect(true))
    act(() => vi.advanceTimersByTime(4000))
    expect(shown('Event crew waving at Jumbuck Orchard Park')).not.toBeNull()

    act(() => reduceMotion(true))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('Event crew waving at Jumbuck Orchard Park')).toBeNull()
  })

  it('plays the video when the viewer turns reduced motion back off', () => {
    reduceMotion(true)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    render(<Hero {...pageHero()} />)
    expect(play).not.toHaveBeenCalled()

    act(() => reduceMotion(false))

    expect(play).toHaveBeenCalledOnce()
  })
})
