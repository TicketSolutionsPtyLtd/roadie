import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Delta } from '.'

describe('Delta', () => {
  it('colours by meaning and speaks the change', () => {
    const { container } = render(
      <Delta
        value={-0.04}
        format='percent'
        goodWhen='up'
        context='on last week'
      />
    )
    const delta = container.querySelector('[data-slot=delta]')!
    expect(delta).toHaveClass('text-chart-status-critical')
    expect(delta).toHaveAttribute('data-direction', 'down')
    expect(delta).toHaveTextContent('4%')
    expect(screen.getByText('down 4%, worse, on last week')).toHaveClass(
      'sr-only'
    )
  })

  it('treats falling costs as good', () => {
    const { container } = render(<Delta value={-12} goodWhen='down' />)
    expect(container.querySelector('[data-slot=delta]')).toHaveClass(
      'text-chart-status-good'
    )
  })

  it('shows no arrow for no change', () => {
    const { container } = render(<Delta value={0} format='percent' />)
    const delta = container.querySelector('[data-slot=delta]')!
    expect(container.querySelector('svg')).toBeNull()
    expect(delta).toHaveClass('text-subtle')
    expect(delta).toHaveTextContent('No change')
  })

  it('reads direction from a baseline', () => {
    const { container } = render(
      <Delta value={112} format='index' baseline={100} />
    )
    const delta = container.querySelector('[data-slot=delta]')!
    expect(delta).toHaveTextContent('112')
    expect(delta).toHaveAttribute('data-direction', 'up')
  })

  it('shows an unavailable change as not available', () => {
    const { container } = render(<Delta value={Number.NaN} format='points' />)
    const delta = container.querySelector('[data-slot=delta]')!
    expect(container.querySelector('svg')).toBeNull()
    expect(delta).toHaveClass('text-subtle')
    expect(delta).toHaveAttribute('data-direction', 'none')
    expect(
      screen.getByText('Not available', { selector: '.sr-only' })
    ).toBeInTheDocument()
    expect(delta).not.toHaveTextContent('No change')
  })
})

describe('Delta decimal places', () => {
  it('shows and speaks the change to its decimal places', () => {
    render(<Delta value={-0.0127} format='percent' decimals={2} />)
    expect(screen.getByText('1.27%')).toHaveAttribute('aria-hidden')
    expect(screen.getByText('down 1.27%, worse')).toHaveClass('sr-only')
  })

  it('trims zeros from a whole amount, against a baseline too', () => {
    render(
      <Delta
        value={1200}
        format='currency'
        baseline={1000}
        trailingZeroDisplay='stripIfInteger'
      />
    )
    expect(screen.getByText('$1,200')).toHaveAttribute('aria-hidden')
    expect(
      screen.getByText('$1,200, up $200, better', { selector: '.sr-only' })
    ).toBeInTheDocument()
  })
})
