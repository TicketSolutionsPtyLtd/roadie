import { useEffect } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Carousel, type CarouselProps, useCarouselUnsafeEmbla } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import type { CarouselContentOverflow } from './variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const box = (text: string) => screen.getByText(text).getBoundingClientRect()
const content = () => document.querySelector('[data-slot="carousel-content"]')!
// Where a slide sits in the viewport.
const offset = (text: string, side: 'left' | 'top') =>
  box(text)[side] - content().getBoundingClientRect()[side]
// Embla settles up to a pixel short of a snap.
const settlesAt = (text: string, side: 'left' | 'top', at: number) =>
  expect.poll(() => Math.abs(offset(text, side) - at)).toBeLessThan(1)

function Shows({
  direction,
  autoPlay,
  overflow = 'hidden',
  count = 3
}: Pick<CarouselProps, 'direction' | 'autoPlay'> & {
  overflow?: CarouselContentOverflow
  count?: number
}) {
  return (
    <div style={{ width: 400, margin: 32 }}>
      <Carousel aria-label='Shows' direction={direction} autoPlay={autoPlay}>
        <Carousel.Content overflow={overflow} style={{ height: 200 }}>
          {Array.from({ length: count }, (_, index) => (
            <Carousel.Item key={index}>
              <div style={{ height: 160 }}>Show {index + 1}</div>
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>
    </div>
  )
}

describe('Carousel direction', () => {
  it('lays slides side by side and moves across with the right arrow', async () => {
    render(<Shows />)
    // A 16px gutter between slides.
    expect(box('Show 2').left).toBe(box('Show 1').right + 16)
    expect(box('Show 2').top).toBe(box('Show 1').top)
    const start = offset('Show 1', 'left')
    await userEvent.click(content())
    await userEvent.keyboard('{ArrowRight}')
    await settlesAt('Show 2', 'left', start)
  })

  it('stacks slides and moves down with the down arrow when vertical', async () => {
    render(<Shows direction='vertical' />)
    expect(offset('Show 1', 'left')).toBe(0)
    expect(box('Show 2').left).toBe(box('Show 1').left)
    expect(box('Show 2').top).toBeGreaterThan(box('Show 1').bottom)
    const start = offset('Show 1', 'top')
    await userEvent.click(content())
    await userEvent.keyboard('{ArrowDown}')
    await settlesAt('Show 2', 'top', start)
  })
})

describe('Carousel overflow', () => {
  beforeEach(() => page.viewport(1024, 768))
  afterEach(() => page.viewport(1024, 768))

  // How much of a slide is drawn; IntersectionObserver applies every
  // ancestor's clip, and inert slides can't be hit tested.
  const drawn = (text: string) =>
    new Promise<number>((resolve) => {
      const observer = new IntersectionObserver(([entry]) => {
        observer.disconnect()
        resolve(entry!.intersectionRatio)
      })
      observer.observe(screen.getByText(text))
    })

  it.each([
    ['hidden', 0],
    ['visible', 1]
  ] as const)(
    'with %s, draws %s of the next slide past the frame',
    async (overflow, share) => {
      render(<Shows overflow={overflow} />)
      expect(await drawn('Show 2')).toBe(share)
    }
  )

  it.each([
    [375, 16],
    [1024, 24]
  ])(
    'bleeds subtle slides past each edge behind a fade at %ipx: %ipx',
    async (width, bleed) => {
      await page.viewport(width, 768)
      render(<Shows overflow='subtle' />)
      const frame = screen.getByRole('region').getBoundingClientRect()
      const viewport = content().getBoundingClientRect()
      expect(viewport.left).toBe(frame.left - bleed)
      expect(viewport.right).toBe(frame.right + bleed)
      for (const edge of ['::before', '::after']) {
        const fade = getComputedStyle(content(), edge)
        expect(fade.width).toBe(`${bleed}px`)
        expect(fade.backgroundImage).toMatch(/^linear-gradient/)
      }
    }
  )
})

describe('Carousel snapping', () => {
  it('pages through slides a frame at a time, each page flush left', async () => {
    render(
      <div style={{ width: 600 }}>
        <Carousel aria-label='Shows'>
          <Carousel.Content overflow='hidden'>
            {['Show 1', 'Show 2', 'Show 3', 'Show 4', 'Show 5'].map((show) => (
              <Carousel.Item key={show} className='basis-2/5'>
                {show}
              </Carousel.Item>
            ))}
          </Carousel.Content>
          <Carousel.Dots />
          <Carousel.Next />
        </Carousel>
      </div>
    )
    await expect
      .poll(
        () => screen.getAllByRole('button', { name: /^Go to slide/ }).length
      )
      .toBe(3)
    const start = offset('Show 1', 'left')
    const next = screen.getByRole('button', { name: 'Next slide' })
    await userEvent.click(next)
    await settlesAt('Show 3', 'left', start)
    await userEvent.click(next)
    await expect
      .poll(() =>
        Math.abs(box('Show 5').right - content().getBoundingClientRect().right)
      )
      .toBeLessThan(1)
    await expect.element(next).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('Carousel controls', () => {
  function AllInView({ forceVisible }: { forceVisible?: boolean }) {
    return (
      <div style={{ width: 600 }}>
        <Carousel aria-label='Shows'>
          <Carousel.Content>
            {['Show 1', 'Show 2', 'Show 3'].map((show) => (
              <Carousel.Item key={show} className='basis-1/3'>
                {show}
              </Carousel.Item>
            ))}
          </Carousel.Content>
          <Carousel.Controls forceVisible={forceVisible}>
            <button type='button'>Share</button>
          </Carousel.Controls>
        </Carousel>
      </div>
    )
  }

  // Embla has measured the three slides into one snap.
  const measured = () =>
    expect
      .poll(() => screen.getByRole('group', { name: '3 of 3' }).inert)
      .toBe(false)

  it('hides the controls once every slide fits', async () => {
    render(<AllInView />)
    await measured()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
  })

  it('keeps the app’s own controls with forceVisible when every slide fits', async () => {
    render(<AllInView forceVisible />)
    await measured()
    expect(screen.getByRole('button', { name: 'Share' })).toBeVisible()
  })
})

describe('Carousel autoplay', () => {
  afterEach(() => vi.useRealTimers())

  it('moves to the next slide once the delay given has passed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    render(<Shows autoPlay={5000} />)
    const start = offset('Show 1', 'left')
    await vi.advanceTimersByTimeAsync(4999)
    expect(offset('Show 1', 'left')).toBe(start)
    await vi.advanceTimersByTimeAsync(1)
    await settlesAt('Show 2', 'left', start)
  })

  function OnReInit({ run }: { run: () => void }) {
    const api = useCarouselUnsafeEmbla()
    useEffect(() => {
      api?.on('reinit', run)
      return () => {
        api?.off('reinit', run)
      }
    }, [api, run])
    return null
  }

  function Autoplaying({
    width = 400,
    count = 3,
    onReInit = () => {}
  }: {
    width?: number
    count?: number
    onReInit?: () => void
  }) {
    return (
      <div style={{ width, margin: 32, display: 'grid', gap: 64 }}>
        <Carousel aria-label='Shows' autoPlay={5000}>
          <Carousel.Content overflow='hidden'>
            {Array.from({ length: count }, (_, index) => (
              <Carousel.Item key={index}>Show {index + 1}</Carousel.Item>
            ))}
          </Carousel.Content>
          <Carousel.Dots />
          <Carousel.PlayPause />
          <OnReInit run={onReInit} />
        </Carousel>
        <button type='button'>Elsewhere</button>
      </div>
    )
  }

  const showing = (slide: number) =>
    expect
      .element(page.getByRole('button', { name: `Go to slide ${slide}` }))
      .toHaveAttribute('aria-current', 'true')
  const dots = (count: number) =>
    expect
      .poll(
        () => screen.getAllByRole('button', { name: /^Go to slide/ }).length
      )
      .toBe(count)
  // Read once, after a real interaction has let React render a pending move.
  const stillShowingFirst = () =>
    expect(
      screen.getByRole('button', { name: 'Go to slide 1' })
    ).toHaveAttribute('aria-current', 'true')
  const leave = () =>
    userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }), {
      force: true
    })

  it('keeps moving after the carousel is resized', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let reInits = 0
    const onReInit = () => reInits++
    const { rerender } = render(<Autoplaying onReInit={onReInit} />)
    await dots(3)
    const before = reInits
    rerender(<Autoplaying onReInit={onReInit} width={360} />)
    await expect.poll(() => reInits).toBeGreaterThan(before)
    await vi.advanceTimersByTimeAsync(5000)
    await showing(2)
  })

  it('stays paused through a reInit until the user plays again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { rerender } = render(<Autoplaying />)
    await dots(3)
    await userEvent.click(
      screen.getByRole('button', { name: 'Pause carousel' }),
      { force: true }
    )
    await leave()
    rerender(<Autoplaying count={4} />)
    await dots(4)
    await vi.advanceTimersByTimeAsync(5000)
    await userEvent.click(
      screen.getByRole('button', { name: 'Play carousel' }),
      { force: true }
    )
    stillShowingFirst()
    await leave()
    await vi.advanceTimersByTimeAsync(5000)
    await showing(2)
  })

  it.each([
    [
      'hovered',
      () => userEvent.hover(screen.getByText('Show 1'), { force: true })
    ],
    [
      'focused',
      () => screen.getByRole('button', { name: 'Go to slide 1' }).focus()
    ]
  ])(
    'holds through a reInit while %s, then moves on once left',
    async (_, hold) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { rerender } = render(<Autoplaying />)
      await dots(3)
      await hold()
      rerender(<Autoplaying count={4} />)
      await dots(4)
      await vi.advanceTimersByTimeAsync(5000)
      await leave()
      stillShowingFirst()
      await vi.advanceTimersByTimeAsync(5000)
      await showing(2)
    }
  )
})
