import { act } from 'react'

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { withFrames } from '@oztix/roadie-browser-testing'

import { Hero } from '.'
import { photo, withBrowserPage } from '../_test/browser'
import { bento } from './fixtures'

withBrowserPage()

const FIRST = 'The Oztix team at Antler Kettle Hall'
const SECOND = 'Event crew waving at Jumbuck Orchard Park'
const SECONDARY = 'A band on stage at Kazoo Hollow Room'

const shown = (name: string) => screen.queryByRole('img', { name })
const toggle = (name: RegExp) => screen.getByRole('button', { name })

// Waits a frame at a time, with frames kept running. Not expect.poll, which
// advances fake timers between checks and so moves the cycle on early.
const untilFrame = (done: () => boolean) =>
  withFrames(async () => {
    for (let frame = 0; !done(); frame++) {
      if (frame > 300) throw new Error(`Still waiting for ${done}`)
      await new Promise(requestAnimationFrame)
    }
  })

// Only the cycle's interval is fake, so the observer and frames stay real.
const cycling = () => untilFrame(() => vi.getTimerCount() > 0)
const stopped = () => untilFrame(() => vi.getTimerCount() === 0)

const intersectionCheck = (element: Element) =>
  new Promise((done) => {
    const observer = new IntersectionObserver(() => {
      observer.disconnect()
      done(null)
    })
    observer.observe(element)
  })

// Two checks, because the hero's own observer can be told a frame after a new
// one; act flushes what its report rendered.
const heardByObserver = (element: Element) =>
  withFrames(async () => {
    await act(() => intersectionCheck(element))
    await act(() => intersectionCheck(element))
  })

const primaryPanel = (container: HTMLElement) =>
  container.querySelector('[data-slot=hero-primary]')!

let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

describe('Hero photo cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    // The fixture's video has no file; a spy stands in for playback.
    play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('moves to the next primary photo every four seconds while on screen', async () => {
    render(<Hero {...bento(photo)} />)
    await cycling()
    act(() => vi.advanceTimersByTime(3999))
    expect(shown(FIRST)).not.toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(shown(FIRST)).toBeNull()
    expect(shown(SECOND)).not.toBeNull()

    act(() => vi.advanceTimersByTime(4000))
    expect(shown(FIRST)).not.toBeNull()
  })

  it('holds still off screen', async () => {
    const { container } = render(
      <>
        <div style={{ height: '300vh' }} />
        <Hero {...bento(photo)} />
      </>
    )
    await heardByObserver(primaryPanel(container))

    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(10000))
    expect(shown(FIRST)).not.toBeNull()
    expect(shown(SECONDARY)).not.toBeNull()
  })

  it('holds the first photos, and leaves the video paused, for viewers who reduce motion', async () => {
    await commands.reducedMotion(true)
    const { container } = render(<Hero {...bento(photo)} />)
    await heardByObserver(primaryPanel(container))

    act(() => vi.advanceTimersByTime(10000))

    expect(vi.getTimerCount()).toBe(0)
    expect(shown(FIRST)).not.toBeNull()
    expect(shown(SECONDARY)).not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot=hero-primary] img')
    ).toHaveLength(1)
    expect(play).not.toHaveBeenCalled()
  })

  it('holds the photo it’s on, never a blank, when the viewer turns on reduced motion mid-cycle', async () => {
    render(<Hero {...bento(photo)} />)
    await cycling()
    act(() => vi.advanceTimersByTime(4000))
    expect(shown(SECOND)).not.toBeNull()

    await commands.reducedMotion(true)
    await stopped()
    act(() => vi.advanceTimersByTime(4000))

    expect(shown(SECOND)).not.toBeNull()
    expect(pause).toHaveBeenCalled()
  })

  it('pauses and plays the video and the photos with one toggle', async () => {
    render(<Hero {...bento(photo)} />)
    await cycling()
    expect(toggle(/pause/i)).not.toHaveAttribute('aria-pressed')

    await userEvent.click(toggle(/pause/i))
    await stopped()
    act(() => vi.advanceTimersByTime(4000))

    expect(pause).toHaveBeenCalled()
    expect(shown(FIRST)).not.toBeNull()
    expect(toggle(/play/i)).not.toHaveAttribute('aria-pressed')

    play.mockClear()
    await userEvent.click(toggle(/play/i))
    await cycling()
    act(() => vi.advanceTimersByTime(4000))

    expect(play).toHaveBeenCalledOnce()
    expect(shown(SECOND)).not.toBeNull()
  })
})
