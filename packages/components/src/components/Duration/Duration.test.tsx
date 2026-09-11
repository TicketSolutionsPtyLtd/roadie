import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Duration } from './index'

describe('Duration', () => {
  it('renders a time element carrying an ISO 8601 duration', () => {
    render(<Duration of={9_000_000} />)
    const el = screen.getByText('2 hours 30 minutes')
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('datetime', 'PT2H30M')
  })

  it('takes an ISO string and the field form, not just milliseconds', () => {
    const { rerender } = render(<Duration of='PT2H30M' />)
    expect(screen.getByText('2 hours 30 minutes')).toHaveAttribute(
      'datetime',
      'PT2H30M'
    )

    rerender(<Duration of={{ hours: 2, minutes: 30 }} />)
    expect(screen.getByText('2 hours 30 minutes')).toHaveAttribute(
      'datetime',
      'PT2H30M'
    )
  })

  it('abbreviates on request', () => {
    render(<Duration of='PT2H30M' durationStyle='short' />)
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
  })

  // A month has no fixed length, so there is nothing honest to render.
  it('renders nothing for a length that cannot be resolved', () => {
    const { container } = render(<Duration of='P1M' />)
    expect(container).toBeEmptyDOMElement()
  })
})
