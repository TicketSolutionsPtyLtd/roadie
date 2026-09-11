import { type ReactElement, cloneElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { cn } from '@oztix/roadie-core/utils'

import { Badge } from '.'

describe('Badge', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Badge>New</Badge>)
    const badge = getByText('New')
    expect(badge).toBeInTheDocument()
    expect(badge.tagName.toLowerCase()).toBe('span')
    expect(badge).not.toHaveClass('intent-neutral')
    expect(badge).toHaveClass('emphasis-normal')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Badge intent='accent'>Accent</Badge>
    )
    expect(getByText('Accent')).toHaveClass('intent-accent')

    rerender(<Badge intent='danger'>Danger</Badge>)
    expect(getByText('Danger')).toHaveClass('intent-danger')

    rerender(<Badge intent='success'>Success</Badge>)
    expect(getByText('Success')).toHaveClass('intent-success')

    rerender(<Badge intent='warning'>Warning</Badge>)
    expect(getByText('Warning')).toHaveClass('intent-warning')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Badge emphasis='strong'>Strong</Badge>
    )
    expect(getByText('Strong')).toHaveClass('emphasis-strong')

    rerender(<Badge emphasis='subtle'>Subtle</Badge>)
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle')

    rerender(<Badge emphasis='subtler'>Subtler</Badge>)
    expect(getByText('Subtler')).toHaveClass('emphasis-subtler')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Badge size='sm'>Small</Badge>)
    expect(getByText('Small')).toHaveClass('text-xs')

    rerender(<Badge size='md'>Medium</Badge>)
    expect(getByText('Medium')).toHaveClass('text-sm')
  })

  it('applies custom className', () => {
    const { getByText } = render(<Badge className='custom-class'>Custom</Badge>)
    expect(getByText('Custom')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { getByText } = render(
      <Badge data-testid='my-badge' id='badge-1'>
        Test
      </Badge>
    )
    const badge = getByText('Test')
    expect(badge).toHaveAttribute('data-testid', 'my-badge')
    expect(badge).toHaveAttribute('id', 'badge-1')
  })

  describe('hideLabel', () => {
    const renderDot = (ui: ReactElement) => {
      const { container, getByText } = render(ui)
      const badge = container.querySelector('[data-slot="badge"]')!
      return { badge, getByText }
    }

    it('keeps the label in the DOM but visually hidden', () => {
      const { getByText } = renderDot(<Badge hideLabel>3 unread</Badge>)
      expect(getByText('3 unread')).toHaveClass('sr-only')
    })

    it('shrinks the badge to a dot with no inner indicator', () => {
      const { badge } = renderDot(<Badge hideLabel>3 unread</Badge>)
      expect(badge).toHaveClass('size-2.5', 'rounded-full', 'p-0', 'gap-0')
      expect(badge).not.toHaveClass('px-2.5', 'py-0.5')
      expect(badge.querySelector('[aria-hidden="true"]')).toBeNull()
    })

    it('sizes the dot from size', () => {
      const { badge } = renderDot(
        <Badge hideLabel size='sm'>
          New
        </Badge>
      )
      expect(badge).toHaveClass('size-2')
      expect(badge).not.toHaveClass('size-2.5', 'px-2')
    })

    it.each(['strong', 'normal', 'subtle', 'subtler'] as const)(
      'paints the dot with emphasis %s',
      (emphasis) => {
        const { badge } = renderDot(
          <Badge hideLabel emphasis={emphasis}>
            New
          </Badge>
        )
        expect(badge).toHaveClass(`emphasis-${emphasis}`)
      }
    )

    it('survives cloneElement with a merged className', () => {
      const consumerBadge = (
        <Badge intent='danger' emphasis='strong' className='custom'>
          3 unread
        </Badge>
      )
      const { badge, getByText } = renderDot(
        cloneElement(consumerBadge, {
          hideLabel: true,
          className: cn(consumerBadge.props.className, 'absolute end-1 top-1')
        })
      )
      expect(badge).toHaveClass(
        'custom',
        'absolute',
        'end-1',
        'top-1',
        'size-2.5',
        'intent-danger',
        'emphasis-strong'
      )
      expect(getByText('3 unread')).toHaveClass('sr-only')
    })

    it('ignores indicator because the badge is the dot', () => {
      const { badge } = renderDot(
        <Badge hideLabel indicator>
          3 unread
        </Badge>
      )
      expect(badge.querySelector('[aria-hidden="true"]')).toBeNull()
    })

    it('keeps intent and emphasis', () => {
      const { badge } = renderDot(
        <Badge hideLabel intent='danger' emphasis='strong'>
          3 unread
        </Badge>
      )
      expect(badge).toHaveClass('intent-danger', 'emphasis-strong')
    })

    it('pulses the badge itself with indicatorPulse', () => {
      const { badge } = renderDot(
        <Badge hideLabel indicatorPulse>
          Live
        </Badge>
      )
      expect(badge).toHaveClass('animate-pulse')
    })

    it('leaves the default badge unchanged', () => {
      const { badge, getByText } = renderDot(<Badge indicator>Active</Badge>)
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-sm')
      expect(badge).not.toHaveClass('size-2.5', 'animate-pulse')
      expect(getByText('Active')).not.toHaveClass('sr-only')
      expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull()
    })
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Badge intent='accent' emphasis='strong' size='md' className='extra'>
        Combined
      </Badge>
    )
    const badge = getByText('Combined')
    expect(badge).toHaveClass(
      'intent-accent',
      'emphasis-strong',
      'text-sm',
      'extra'
    )
  })
})
