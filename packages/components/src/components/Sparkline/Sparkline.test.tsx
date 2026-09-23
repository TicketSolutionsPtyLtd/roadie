import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sparkline } from '.'

describe('Sparkline', () => {
  it('renders nothing with fewer than five points', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is decorative without a label', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4, 5]} />)
    expect(container.querySelector('[data-slot=sparkline]')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })

  it('is an image with a label and summary', () => {
    render(
      <Sparkline
        values={[1, 2, 3, 4, 5]}
        label='Daily sales'
        summary='Rising for 30 days'
      />
    )
    expect(
      screen.getByRole('img', { name: 'Daily sales. Rising for 30 days' })
    ).toBeInTheDocument()
  })

  it('draws a dashed reference line', () => {
    const { container } = render(
      <Sparkline
        values={[1, 2, 3, 4, 5]}
        reference={{ value: 4, label: 'Target' }}
      />
    )
    expect(container.querySelector('line')).toHaveAttribute(
      'stroke-dasharray',
      '2 2'
    )
  })
})
