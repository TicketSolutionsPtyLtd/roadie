import { waitFor } from '@testing-library/dom'
import { act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Carousel, type UseCarouselReturn, useCarousel } from './index'

function Fixture({
  count = 3,
  loop = false,
  ariaLabel = 'Test carousel'
}: {
  count?: number
  loop?: boolean
  ariaLabel?: string
}) {
  return (
    <Carousel aria-label={ariaLabel} opts={{ loop }}>
      <Carousel.Content>
        {Array.from({ length: count }, (_, i) => (
          <Carousel.Item key={i} data-testid={`slide-${i}`}>
            Slide {i + 1}
          </Carousel.Item>
        ))}
      </Carousel.Content>
      <Carousel.Previous data-testid='prev' />
      <Carousel.Next data-testid='next' />
      <Carousel.Dots data-testid='dots' />
    </Carousel>
  )
}

describe('Carousel', () => {
  it('renders root with carousel role and accessible name', () => {
    const { getByRole } = render(<Fixture />)
    const region = getByRole('region')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(region).toHaveAttribute('aria-label', 'Test carousel')
  })

  it('renders one slide per Carousel.Item with "N of M" label', () => {
    const { getAllByRole } = render(<Fixture count={3} />)
    const slides = getAllByRole('group', { name: /of/ })
    expect(slides).toHaveLength(3)
    expect(slides[0]).toHaveAttribute('aria-label', '1 of 3')
    expect(slides[1]).toHaveAttribute('aria-label', '2 of 3')
    expect(slides[2]).toHaveAttribute('aria-label', '3 of 3')
  })

  it('marks non-active slides as inert', async () => {
    const { getByTestId } = render(<Fixture count={3} />)
    await waitFor(() => {
      expect(getByTestId('slide-0').hasAttribute('inert')).toBe(false)
      expect(getByTestId('slide-1').hasAttribute('inert')).toBe(true)
      expect(getByTestId('slide-2').hasAttribute('inert')).toBe(true)
    })
  })

  it('renders Previous and Next nav buttons', () => {
    const { getByLabelText } = render(<Fixture />)
    expect(getByLabelText('Previous slide')).toBeInTheDocument()
    expect(getByLabelText('Next slide')).toBeInTheDocument()
  })

  it('hides Previous and Next when slideCount <= 1', () => {
    const { queryByLabelText } = render(<Fixture count={1} />)
    expect(queryByLabelText('Previous slide')).toBeNull()
    expect(queryByLabelText('Next slide')).toBeNull()
  })

  it('disables Previous at the start boundary with loop=false', async () => {
    const { getByLabelText } = render(<Fixture count={3} loop={false} />)
    await waitFor(() => {
      expect(getByLabelText('Previous slide')).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    })
    expect(getByLabelText('Next slide')).not.toHaveAttribute('aria-disabled')
  })

  it('does NOT disable Previous with loop=true', async () => {
    const { getByLabelText } = render(<Fixture count={3} loop={true} />)
    await waitFor(() => {
      expect(getByLabelText('Previous slide')).not.toHaveAttribute(
        'aria-disabled'
      )
    })
    expect(getByLabelText('Next slide')).not.toHaveAttribute('aria-disabled')
  })

  it('clicking Next advances the selected index', async () => {
    const user = userEvent.setup()
    const ref: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      ref.current = useCarousel()
      return null
    }
    const { getByLabelText } = render(
      <Carousel aria-label='test'>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    expect(ref.current?.state.selectedIndex).toBe(0)

    await user.click(getByLabelText('Next slide'))
    await waitFor(() => {
      expect(ref.current?.state.selectedIndex).toBe(1)
    })
  })

  it('clicking a dot calls goTo with that index', async () => {
    const user = userEvent.setup()
    const ref: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      ref.current = useCarousel()
      return null
    }
    const { getByLabelText } = render(
      <Carousel aria-label='test'>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Carousel.Dots />
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    await user.click(getByLabelText('Go to slide 3'))
    await waitFor(() => {
      expect(ref.current?.state.selectedIndex).toBe(2)
    })
  })

  it('Dots render one button per slide', () => {
    const { getAllByRole } = render(<Fixture count={4} />)
    // 4 dots + 2 nav buttons = 6 total
    const buttons = getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('Dots hidden when slideCount <= 1', () => {
    const { queryByRole } = render(<Fixture count={1} />)
    expect(queryByRole('group', { name: 'Choose slide to display' })).toBeNull()
  })

  it('useCarousel throws outside of provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function OutsideConsumer() {
      useCarousel()
      return null
    }
    expect(() => render(<OutsideConsumer />)).toThrow(
      /must be used inside <Carousel>/
    )
    spy.mockRestore()
  })

  it('re-initialises Embla when children count changes', async () => {
    const ref: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      ref.current = useCarousel()
      return null
    }
    function Rerender({ count }: { count: number }) {
      return (
        <Carousel aria-label='test'>
          <Carousel.Content>
            {Array.from({ length: count }, (_, i) => (
              <Carousel.Item key={i}>{i}</Carousel.Item>
            ))}
          </Carousel.Content>
          <Spy />
        </Carousel>
      )
    }
    const { rerender } = render(<Rerender count={3} />)
    await waitFor(() => expect(ref.current?.state.slideCount).toBe(3))
    rerender(<Rerender count={5} />)
    await waitFor(() => expect(ref.current?.state.slideCount).toBe(5))
  })

  it('supports opts pass-through (align=start)', async () => {
    const ref: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      ref.current = useCarousel()
      return null
    }
    render(
      <Carousel aria-label='test' opts={{ align: 'start' }}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    // Just asserting the api is live with the custom opts — exhaustive
    // option-coverage belongs to Embla's own tests.
    expect(ref.current?.state.slideCount).toBe(3)
  })

  // ── Phase 3: Autoplay, header, title, keyboard, reduced motion ──

  function AutoplayFixture({ delay = 5000 }: { delay?: number }) {
    return (
      <Carousel aria-label='autoplay carousel' autoPlay={delay}>
        <Carousel.Header>
          <Carousel.Title>Featured</Carousel.Title>
          <Carousel.PlayPause />
          <Carousel.Previous />
          <Carousel.Next />
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
  }

  it('wires the autoplay plugin when autoPlay is set', async () => {
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    expect(capture.current?.api?.plugins().autoplay).toBeDefined()
    expect(capture.current?.state.hasAutoPlay).toBe(true)
  })

  it('does NOT wire the autoplay plugin when prefers-reduced-motion is set', async () => {
    act(() => {
      ;(
        globalThis as unknown as { __setReducedMotion?: (v: boolean) => void }
      ).__setReducedMotion?.(true)
    })
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    expect(capture.current?.api?.plugins().autoplay).toBeUndefined()
    expect(capture.current?.state.isPlaying).toBe(false)
  })

  it('Carousel.PlayPause is hidden when autoPlay is not set', () => {
    const { queryByLabelText } = render(
      <Carousel aria-label='test'>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Carousel.PlayPause />
      </Carousel>
    )
    expect(queryByLabelText(/pause carousel|play carousel/i)).toBeNull()
  })

  it('Carousel.PlayPause renders when autoPlay is set', async () => {
    const { findByLabelText } = render(<AutoplayFixture />)
    // After autoplay starts, button should show "Pause carousel"
    const button = await findByLabelText(/pause carousel|play carousel/i)
    expect(button).toBeInTheDocument()
  })

  it('click on PlayPause flips userPaused and stops autoplay', async () => {
    const user = userEvent.setup()
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    const { findByLabelText } = render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Carousel.PlayPause />
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    await waitFor(() => expect(capture.current?.state.isPlaying).toBe(true))
    const pauseBtn = await findByLabelText('Pause carousel')
    await user.click(pauseBtn)
    await waitFor(() => {
      expect(capture.current?.state.isPlaying).toBe(false)
      expect(capture.current?.state.userPaused).toBe(true)
    })
    // Click again to resume
    const playBtn = await findByLabelText('Play carousel')
    await user.click(playBtn)
    await waitFor(() => {
      expect(capture.current?.state.isPlaying).toBe(true)
      expect(capture.current?.state.userPaused).toBe(false)
    })
  })

  it('aria-live on Content is "off" during autoplay and "polite" when user-paused', async () => {
    const user = userEvent.setup()
    const { findByLabelText, container } = render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content data-testid='content'>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Carousel.PlayPause />
      </Carousel>
    )
    const content = container.querySelector(
      '[data-testid="content"]'
    ) as HTMLElement
    await waitFor(() => expect(content.getAttribute('aria-live')).toBe('off'))
    const pauseBtn = await findByLabelText('Pause carousel')
    await user.click(pauseBtn)
    await waitFor(() =>
      expect(content.getAttribute('aria-live')).toBe('polite')
    )
  })

  it('aria-live on Content is "polite" when no autoPlay', () => {
    const { container } = render(
      <Carousel aria-label='test'>
        <Carousel.Content data-testid='content'>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const content = container.querySelector(
      '[data-testid="content"]'
    ) as HTMLElement
    expect(content.getAttribute('aria-live')).toBe('polite')
  })

  it('Carousel.Title without href renders an <h2>', () => {
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.Title>My Title</Carousel.Title>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const heading = getByRole('heading', { level: 2, name: 'My Title' })
    expect(heading.tagName).toBe('H2')
  })

  it('Carousel.Title with href renders an anchor', () => {
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.Title href='/events'>My Title</Carousel.Title>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const link = getByRole('link', { name: /My Title/ })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/events')
  })

  it('root aria-labelledby points to Carousel.Title id', () => {
    const { getByRole } = render(
      <Carousel aria-label='fallback'>
        <Carousel.Header>
          <Carousel.Title id='my-title'>Hello</Carousel.Title>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const region = getByRole('region')
    expect(region).toHaveAttribute('aria-labelledby', 'my-title')
    expect(region).not.toHaveAttribute('aria-label')
  })

  it('keyboard: ArrowRight advances, ArrowLeft goes back (horizontal)', async () => {
    const user = userEvent.setup()
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    const viewport = getByRole('region').querySelector(
      '[tabindex="0"]'
    ) as HTMLElement
    viewport.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(capture.current?.state.selectedIndex).toBe(1))
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(capture.current?.state.selectedIndex).toBe(0))
    await user.keyboard('{End}')
    await waitFor(() => expect(capture.current?.state.selectedIndex).toBe(2))
    await user.keyboard('{Home}')
    await waitFor(() => expect(capture.current?.state.selectedIndex).toBe(0))
  })

  it('keyboard: ArrowRight inside a slide link does NOT advance', async () => {
    const user = userEvent.setup()
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    const { getByText } = render(
      <Carousel aria-label='test'>
        <Carousel.Content>
          <Carousel.Item>
            <a href='/inside'>inside link</a>
          </Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    const link = getByText('inside link')
    link.focus()
    expect(document.activeElement).toBe(link)
    await user.keyboard('{ArrowRight}')
    expect(capture.current?.state.selectedIndex).toBe(0)
  })

  it('reduced motion toggle at runtime stops autoplay', async () => {
    const capture: { current: UseCarouselReturn | null } = { current: null }
    function Spy() {
      capture.current = useCarousel()
      return null
    }
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(capture.current?.api).toBeTruthy())
    await waitFor(() => expect(capture.current?.state.isPlaying).toBe(true))
    act(() => {
      ;(
        globalThis as unknown as { __setReducedMotion?: (v: boolean) => void }
      ).__setReducedMotion?.(true)
    })
    await waitFor(() => {
      expect(capture.current?.api?.plugins().autoplay).toBeUndefined()
      expect(capture.current?.state.isPlaying).toBe(false)
    })
  })

  it('warns in dev for autoPlay delay < 2000ms', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Carousel aria-label='test' autoPlay={1000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('autoPlay delay < 2000ms')
    )
    spy.mockRestore()
  })
})
