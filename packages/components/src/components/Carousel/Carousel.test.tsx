import { waitFor } from '@testing-library/dom'
import { render } from '@testing-library/react'
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
})
