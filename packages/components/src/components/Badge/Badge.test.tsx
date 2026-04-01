import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge } from '.'

describe('Badge', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Badge>New</Badge>)
    const badge = getByText('New')
    expect(badge).toBeInTheDocument()
    expect(badge.tagName.toLowerCase()).toBe('span')
    expect(badge).toHaveClass('intent-neutral')
    expect(badge).toHaveClass('emphasis-subtle')
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
    expect(getByText('Subtler')).toHaveClass('emphasis-subtler-surface')
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
