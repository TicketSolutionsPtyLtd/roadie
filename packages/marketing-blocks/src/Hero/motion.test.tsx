import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { bento } from './fixtures'

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

let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

const toggle = (name: RegExp) => screen.getByRole('button', { name })

describe('Hero photo cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', OnScreenObserver)
    stubMatchMedia()
    play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    observers.clear()
    motionListeners.clear()
    reduced = false
  })

  it('moves to the next primary photo every four seconds while on screen', () => {
    reduceMotion(false)
    render(<Hero {...bento()} secondaryImages={[]} />)
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
    render(<Hero {...bento()} />)

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
  })

  it('holds the first photos, and leaves the video paused, for viewers who reduce motion', () => {
    reduceMotion(true)
    const { container } = render(<Hero {...bento()} />)
    act(() => intersect(true))

    act(() => vi.advanceTimersByTime(10000))

    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(shown('A band on stage at Kazoo Hollow Room')).not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot=hero-primary] img')
    ).toHaveLength(1)
    expect(play).not.toHaveBeenCalled()
  })

  it('holds the photo it’s on, never a blank, when the viewer turns on reduced motion mid-cycle', () => {
    render(<Hero {...bento()} secondaryImages={[]} />)
    act(() => intersect(true))
    act(() => vi.advanceTimersByTime(4000))
    expect(shown('Event crew waving at Jumbuck Orchard Park')).not.toBeNull()

    act(() => reduceMotion(true))
    act(() => vi.advanceTimersByTime(8000))

    expect(shown('Event crew waving at Jumbuck Orchard Park')).not.toBeNull()
    expect(pause).toHaveBeenCalled()
  })

  it('plays the video when the viewer turns reduced motion back off', () => {
    reduceMotion(true)
    render(<Hero {...bento()} />)
    expect(play).not.toHaveBeenCalled()

    act(() => reduceMotion(false))

    expect(play).toHaveBeenCalledOnce()
  })

  it('starts the video from an effect, not the autoplay attribute, so it never plays before hydration', () => {
    const { container } = render(<Hero {...bento()} />)

    expect(container.querySelector('video')).not.toHaveAttribute('autoplay')
    expect(play).toHaveBeenCalledOnce()
  })

  it('pauses and plays the video and the photos with one toggle', () => {
    render(<Hero {...bento()} secondaryImages={[]} />)
    act(() => intersect(true))
    expect(toggle(/pause/i)).toHaveAttribute('aria-pressed', 'false')

    act(() => fireEvent.click(toggle(/pause/i)))
    act(() => vi.advanceTimersByTime(8000))

    expect(pause).toHaveBeenCalled()
    expect(shown('The Oztix team at Antler Kettle Hall')).not.toBeNull()
    expect(toggle(/play/i)).toHaveAttribute('aria-pressed', 'true')

    play.mockClear()
    act(() => fireEvent.click(toggle(/play/i)))
    act(() => vi.advanceTimersByTime(4000))

    expect(play).toHaveBeenCalledOnce()
    expect(shown('Event crew waving at Jumbuck Orchard Park')).not.toBeNull()
  })

  it('starts paused for viewers who reduce motion, and plays when asked', () => {
    reduceMotion(true)
    render(<Hero {...bento()} />)
    expect(play).not.toHaveBeenCalled()

    act(() => fireEvent.click(toggle(/play/i)))

    expect(play).toHaveBeenCalledOnce()
    expect(toggle(/pause/i)).toBeInTheDocument()
  })

  it('has no toggle when nothing in it moves', () => {
    render(
      <Hero
        {...bento()}
        video={undefined}
        primaryImages={bento().primaryImages!.slice(0, 1)}
        secondaryImages={[]}
      />
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  describe('video poster', () => {
    const poster = (container: HTMLElement) =>
      container.querySelector<HTMLElement>('[data-slot=hero-video-poster]')!

    it('covers the video until it is actually playing, then steps aside', () => {
      const { container } = render(<Hero {...bento()} />)
      expect(poster(container)).toBeVisible()

      act(() => fireEvent.playing(container.querySelector('video')!))

      expect(poster(container)).not.toBeVisible()
    })

    it('stays over the video for viewers who reduce motion', () => {
      reduceMotion(true)
      const { container } = render(<Hero {...bento()} />)

      expect(poster(container)).toBeVisible()
    })

    it('keeps the current frame, not the poster, when paused after playing', () => {
      const { container } = render(<Hero {...bento()} />)
      act(() => fireEvent.playing(container.querySelector('video')!))

      act(() => fireEvent.click(toggle(/pause/i)))

      expect(poster(container)).not.toBeVisible()
    })
  })
})
