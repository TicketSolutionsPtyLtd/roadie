import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Button } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='stub-link' href={href} {...rest}>
    {children}
  </a>
)

describe('Button', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Button>Click me</Button>)
    const button = getByText('Click me')
    expect(button).toBeInTheDocument()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).not.toHaveClass('intent-neutral')
    expect(button).toHaveClass('is-interactive')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Button emphasis='strong' intent='accent'>
        Strong
      </Button>
    )
    let button = getByText('Strong')
    expect(button).toHaveClass('emphasis-strong', 'intent-accent')

    rerender(<Button emphasis='normal'>Default</Button>)
    button = getByText('Default')
    expect(button).toHaveClass('emphasis-normal')

    rerender(<Button emphasis='subtle'>Subtle</Button>)
    button = getByText('Subtle')
    expect(button).toHaveClass('emphasis-subtle')

    rerender(<Button emphasis='subtler'>Subtler</Button>)
    button = getByText('Subtler')
    expect(button).toHaveClass('emphasis-subtler')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Button size='sm'>Small</Button>)
    let button = getByText('Small')
    expect(button).toHaveClass('btn-sm')

    rerender(<Button size='md'>Medium</Button>)
    button = getByText('Medium')
    expect(button).toHaveClass('btn-md')

    rerender(<Button size='lg'>Large</Button>)
    button = getByText('Large')
    expect(button).toHaveClass('btn-lg')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Button intent='accent'>Accent</Button>
    )
    let button = getByText('Accent')
    expect(button).toHaveClass('intent-accent')

    rerender(<Button intent='success'>Success</Button>)
    button = getByText('Success')
    expect(button).toHaveClass('intent-success')

    rerender(<Button intent='danger'>Danger</Button>)
    button = getByText('Danger')
    expect(button).toHaveClass('intent-danger')
  })

  it('handles disabled state', () => {
    const { getByText } = render(<Button disabled>Disabled</Button>)
    const button = getByText('Disabled')
    expect(button).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button onClick={handleClick}>Click me</Button>
    )
    await user.click(getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    )
    await user.click(getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <Button className='custom-class'>Custom</Button>
    )
    expect(getByText('Custom')).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Button
        emphasis='strong'
        size='lg'
        intent='accent'
        className='custom-class'
      >
        Combined
      </Button>
    )
    const button = getByText('Combined')
    expect(button).toHaveClass(
      'emphasis-strong',
      'intent-accent',
      'btn-lg',
      'custom-class'
    )
  })

  describe('with href', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renders as a routed anchor when href is set (no provider)', () => {
      const { getByText } = render(<Button href='/events/123'>Events</Button>)
      const link = getByText('Events')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', '/events/123')
      expect(link).toHaveClass('btn', 'is-interactive')
    })

    it('renders through the configured Link when provider is wired', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Button href='/events/123'>Events</Button>
        </RoadieLinkProvider>
      )
      const link = getByTestId('stub-link')
      expect(link).toHaveAttribute('href', '/events/123')
      expect(link).toHaveClass('btn', 'is-interactive')
    })

    it('still renders a button when href is absent', () => {
      const { getByText } = render(<Button onClick={() => {}}>Click</Button>)
      const button = getByText('Click')
      expect(button.tagName.toLowerCase()).toBe('button')
    })

    it('preserves CVA classes whether the rendered element is button or anchor', () => {
      const { rerender, getByText } = render(
        <Button intent='accent' emphasis='strong' size='lg'>
          Btn
        </Button>
      )
      expect(getByText('Btn')).toHaveClass(
        'intent-accent',
        'emphasis-strong',
        'btn-lg'
      )

      rerender(
        <Button href='/x' intent='accent' emphasis='strong' size='lg'>
          Btn
        </Button>
      )
      expect(getByText('Btn')).toHaveClass(
        'intent-accent',
        'emphasis-strong',
        'btn-lg'
      )
    })

    it('does not leak external prop as a DOM attribute', () => {
      const { getByText } = render(
        <Button href='https://example.com' external>
          E
        </Button>
      )
      const link = getByText('E')
      expect(link).not.toHaveAttribute('external')
    })

    it('does not leak href onto a button element when href is absent', () => {
      const { getByText } = render(<Button>Click</Button>)
      expect(getByText('Click')).not.toHaveAttribute('href')
    })

    it('consumer render wins over href synthesis', () => {
      // Suppress dev warning for this test
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getByText } = render(
        <Button href='/x' render={<a href='/y' data-custom='1' />}>
          Custom
        </Button>
      )
      const link = getByText('Custom')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', '/y')
      expect(link).toHaveAttribute('data-custom', '1')
    })

    it('warns in dev only when href and render are passed together', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Only href → no warning
      const { unmount } = render(<Button href='/x'>X</Button>)
      expect(warn).not.toHaveBeenCalled()
      unmount()

      // href + render → exactly one warning
      render(
        <Button href='/x' render={<a href='/y' />}>
          Conflict
        </Button>
      )
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toMatch(/href.*render.*provider routing/i)
    })

    it('does not put href onto the rendered <button> when consumer render is non-anchor', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getByText } = render(
        <Button href='/x' render={<button data-custom='1' />}>
          Btn
        </Button>
      )
      const el = getByText('Btn')
      expect(el.tagName.toLowerCase()).toBe('button')
      expect(el).not.toHaveAttribute('href')
    })
  })
})
