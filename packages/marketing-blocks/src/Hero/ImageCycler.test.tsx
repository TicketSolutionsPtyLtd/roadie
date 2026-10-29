import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { pageHero } from './testUtils'

let intersect: (isIntersecting: boolean) => void

class OnScreenObserver {
  constructor(private callback: IntersectionObserverCallback) {
    intersect = (isIntersecting) =>
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
  }
  observe() {}
  disconnect() {}
}

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: reduce && query.includes('reduce'),
        addEventListener() {},
        removeEventListener() {}
      }) as unknown as MediaQueryList
  )
}

const shown = (name: string) => screen.queryByRole('img', { name })

describe('Hero photo cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', OnScreenObserver)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('moves to the next people photo every four seconds while on screen', () => {
    reduceMotion(false)
    render(<Hero {...pageHero} eventImages={[]} />)
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
    render(<Hero {...pageHero} />)

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
  })

  it('holds the first photos, and pauses the video, for viewers who reduce motion', () => {
    reduceMotion(true)
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})
    const { container } = render(<Hero {...pageHero} />)
    act(() => intersect(true))

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot=hero-people] img')
    ).toHaveLength(1)
    expect(pause).toHaveBeenCalled()
  })
})
