import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { bento } from './fixtures'

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

let play: ReturnType<typeof vi.spyOn>

const toggle = (name: RegExp) => screen.getByRole('button', { name })

// Photo cycling needs a real IntersectionObserver: cycling.browser.test.tsx.
describe('Hero motion', () => {
  beforeEach(() => {
    stubMatchMedia()
    play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    // jsdom has no media playback; pause would throw "not implemented".
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    motionListeners.clear()
    reduced = false
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
        images={bento().images!.slice(0, 1)}
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
