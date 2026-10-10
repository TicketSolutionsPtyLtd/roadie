import { useLayoutEffect } from 'react'

import { waitFor } from '@testing-library/dom'
import { act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EmblaCarouselType } from 'embla-carousel'
import { describe, expect, it, vi } from 'vitest'

import {
  Carousel,
  type UseCarouselReturn,
  useCarousel,
  useCarouselUnsafeEmbla
} from './index'

type Captured = {
  carousel: UseCarouselReturn
  api: EmblaCarouselType | undefined
}

function makeCapture() {
  const ref: { current: Captured | null } = { current: null }
  function Spy() {
    const carousel = useCarousel()
    const api = useCarouselUnsafeEmbla()
    useLayoutEffect(() => {
      ref.current = { carousel, api }
    })
    return null
  }
  return { ref, Spy }
}

// Embla measures nothing in jsdom, so every slide lands on one snap and
// Previous, Next, and Dots never show. Carousel.browser.test.tsx covers them.
function Fixture({ count = 3 }: { count?: number }) {
  return (
    <Carousel aria-label='Test carousel'>
      <Carousel.Content>
        {Array.from({ length: count }, (_, i) => (
          <Carousel.Item key={i}>Slide {i + 1}</Carousel.Item>
        ))}
      </Carousel.Content>
    </Carousel>
  )
}

describe('Carousel', () => {
  it('Carousel and Carousel.Root are the same component reference', () => {
    expect(Carousel).toBe(Carousel.Root)
  })

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
    const { ref, Spy } = makeCapture()
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
    await waitFor(() => expect(ref.current?.carousel.state.slideCount).toBe(3))
    rerender(<Rerender count={5} />)
    await waitFor(() => expect(ref.current?.carousel.state.slideCount).toBe(5))
  })

  it('supports opts pass-through (align=start)', async () => {
    const { ref, Spy } = makeCapture()
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
    expect(ref.current?.carousel.state.slideCount).toBe(3)
  })

  // ── Phase 3: Autoplay, header, title, reduced motion ──

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
    const { ref, Spy } = makeCapture()
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    expect(ref.current?.api?.plugins().autoplay).toBeDefined()
    expect(ref.current?.carousel.state.isPlaying).toBe(true)
  })

  it('does NOT wire the autoplay plugin when prefers-reduced-motion is set', async () => {
    act(() => {
      ;(
        globalThis as unknown as { __setReducedMotion?: (v: boolean) => void }
      ).__setReducedMotion?.(true)
    })
    const { ref, Spy } = makeCapture()
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    expect(ref.current?.api?.plugins().autoplay).toBeUndefined()
    expect(ref.current?.carousel.state.isPlaying).toBe(false)
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
    const { ref, Spy } = makeCapture()
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
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    await waitFor(() =>
      expect(ref.current?.carousel.state.isPlaying).toBe(true)
    )
    const pauseBtn = await findByLabelText('Pause carousel')
    await user.click(pauseBtn)
    await waitFor(() => {
      expect(ref.current?.carousel.state.isPlaying).toBe(false)
      expect(ref.current?.carousel.state.userPaused).toBe(true)
    })
    // Click again to resume
    const playBtn = await findByLabelText('Play carousel')
    await user.click(playBtn)
    await waitFor(() => {
      expect(ref.current?.carousel.state.isPlaying).toBe(true)
      expect(ref.current?.carousel.state.userPaused).toBe(false)
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

  it('Carousel.Title renders an <h2>', () => {
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

  it('Carousel.Title with as="h3" renders an h3', () => {
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.Title as='h3'>Section</Carousel.Title>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const heading = getByRole('heading', { level: 3, name: 'Section' })
    expect(heading.tagName).toBe('H3')
  })

  it('Carousel.Title with render={<h3 />} renders an h3 and keeps registration', () => {
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.Title render={<h3 />}>Section</Carousel.Title>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const heading = getByRole('heading', { level: 3, name: 'Section' })
    expect(heading.tagName).toBe('H3')
    expect(heading).toHaveAttribute('data-slot', 'carousel-title')
    // registered as the carousel's accessible name
    expect(getByRole('region')).toHaveAccessibleName('Section')
  })

  it('Carousel.TitleLink with as prop renders the custom component', () => {
    const FakeLink = ({
      href,
      children,
      ...rest
    }: {
      href?: string
      children?: React.ReactNode
      className?: string
    }) => (
      <a data-testid='fake-link' href={href} {...rest}>
        {children}
      </a>
    )
    const { getByTestId } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.TitleLink as={FakeLink} href='/events'>
            Featured
          </Carousel.TitleLink>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const link = getByTestId('fake-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/events')
    expect(link).toHaveTextContent('Featured')
  })

  it('Carousel.TitleLink with href renders an anchor', () => {
    const { getByRole } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.TitleLink href='/events'>My Title</Carousel.TitleLink>
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

  it('Carousel.TitleLink preserves trailing arrow when render element has its own children', () => {
    // Regression: COR-001 — element-form render carrying children would
    // drop the decorative ArrowRightIcon because mergeProps' override
    // rule replaced default children with render-element children.
    const { getByText, container } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.TitleLink render={<a href='/all'>See all</a>}>
            Events
          </Carousel.TitleLink>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    expect(getByText('See all')).toBeInTheDocument()
    // ArrowRightIcon renders as an <svg>; assert one exists inside the
    // title-link slot specifically.
    const titleLink = container.querySelector(
      '[data-slot="carousel-title-link"]'
    )
    expect(titleLink?.querySelector('svg')).toBeInTheDocument()
  })

  it('Carousel.TitleLink render escape hatch wins over href smart-routing', () => {
    const { getByText } = render(
      <Carousel aria-label='test'>
        <Carousel.Header>
          <Carousel.TitleLink
            href='/x'
            render={<a href='/y' data-custom='1' />}
          >
            Title
          </Carousel.TitleLink>
        </Carousel.Header>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel>
    )
    const link = getByText(/Title/)
    expect(link).toHaveAttribute('href', '/y')
    expect(link).toHaveAttribute('data-custom', '1')
    expect(link).toHaveClass('text-display-ui-5')
  })

  it('Carousel.TitleLink href routes through configured RoadieLinkProvider', async () => {
    const { RoadieLinkProvider } =
      await import('../../providers/RoadieLinkProvider')
    const StubLink = ({
      href,
      children,
      ...rest
    }: {
      href: string
      children?: React.ReactNode
    }) => (
      <a data-testid='stub-link' href={href} {...rest}>
        {children}
      </a>
    )
    const { getByTestId } = render(
      <RoadieLinkProvider Link={StubLink}>
        <Carousel aria-label='test'>
          <Carousel.Header>
            <Carousel.TitleLink href='/events'>Events</Carousel.TitleLink>
          </Carousel.Header>
          <Carousel.Content>
            <Carousel.Item>1</Carousel.Item>
          </Carousel.Content>
        </Carousel>
      </RoadieLinkProvider>
    )
    expect(getByTestId('stub-link')).toHaveAttribute('href', '/events')
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

  it('reduced motion toggle at runtime stops autoplay', async () => {
    const { ref, Spy } = makeCapture()
    render(
      <Carousel aria-label='test' autoPlay={5000}>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
        </Carousel.Content>
        <Spy />
      </Carousel>
    )
    await waitFor(() => expect(ref.current?.api).toBeTruthy())
    await waitFor(() =>
      expect(ref.current?.carousel.state.isPlaying).toBe(true)
    )
    act(() => {
      ;(
        globalThis as unknown as { __setReducedMotion?: (v: boolean) => void }
      ).__setReducedMotion?.(true)
    })
    await waitFor(() => {
      expect(ref.current?.api?.plugins().autoplay).toBeUndefined()
      expect(ref.current?.carousel.state.isPlaying).toBe(false)
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
