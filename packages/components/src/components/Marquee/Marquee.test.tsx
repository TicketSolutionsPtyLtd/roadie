import { fireEvent, render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { Marquee } from '.'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

describe('Marquee', () => {
  it('renders with default props', () => {
    const { container } = render(
      <Marquee>
        <div>Item 1</div>
        <div>Item 2</div>
      </Marquee>
    )
    const root = container.firstElementChild!
    expect(root).toBeInTheDocument()
    expect(root).toHaveClass('overflow-hidden')
  })

  it('renders children in both track halves', () => {
    const { container } = render(
      <Marquee>
        <div>Item</div>
      </Marquee>
    )
    // Track has two child sets (Set A + Set B clone)
    const track = container.querySelector('[style*="animation"]') as HTMLElement
    expect(track.children).toHaveLength(2)
    // The clone set is aria-hidden
    expect(track.children[1]).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies aria-label', () => {
    const { container } = render(
      <Marquee aria-label='Partner logos'>
        <div>Logo</div>
      </Marquee>
    )
    expect(container.firstElementChild).toHaveAttribute(
      'aria-label',
      'Partner logos'
    )
  })

  it('applies custom className', () => {
    const { container } = render(
      <Marquee className='custom-class'>
        <div>Item</div>
      </Marquee>
    )
    expect(container.firstElementChild).toHaveClass('custom-class')
  })

  it('applies custom gap to track', () => {
    const { container } = render(
      <Marquee gap={24}>
        <div>Item</div>
      </Marquee>
    )
    const track = container.querySelector('[style*="animation"]') as HTMLElement
    expect(track.style.gap).toBe('24px')
  })

  it('applies reverse animation direction', () => {
    const { container } = render(
      <Marquee direction='reverse'>
        <div>Item</div>
      </Marquee>
    )
    const track = container.querySelector('[style*="animation"]') as HTMLElement
    expect(track.style.animationDirection).toBe('reverse')
  })

  it('pauses and resumes on hover when pauseOnHover is enabled', () => {
    const { container } = render(
      <Marquee pauseOnHover>
        <div>Item</div>
      </Marquee>
    )
    const track = container.querySelector('[style*="animation"]') as HTMLElement
    fireEvent.mouseEnter(track)
    expect(track.style.animationPlayState).toBe('paused')
    fireEvent.mouseLeave(track)
    expect(track.style.animationPlayState).toBe('running')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Marquee data-testid='my-marquee' id='marquee-1'>
        <div>Item</div>
      </Marquee>
    )
    const root = container.firstElementChild!
    expect(root).toHaveAttribute('data-testid', 'my-marquee')
    expect(root).toHaveAttribute('id', 'marquee-1')
  })
})
