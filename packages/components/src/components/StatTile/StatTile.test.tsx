import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatTile } from '.'

describe('StatTile', () => {
  it('is a stat-sized card with a sparkline', () => {
    const { container } = render(
      <StatTile
        label='Sell-through'
        value={0.77}
        format='percent'
        trend={[0.3, 0.4, 0.5, 0.6, 0.77]}
        reference={{ value: 0.85, label: 'Target' }}
      />
    )
    expect(container.querySelector('[data-slot=data-card]')).toHaveAttribute(
      'data-size',
      'stat'
    )
    expect(container.querySelector('[data-slot=sparkline]')).toBeInTheDocument()
    expect(screen.getByText('77%')).toBeInTheDocument()
  })

  it('hides the sparkline without enough history', () => {
    const { container } = render(
      <StatTile
        label='Tickets sold'
        value={180}
        trend={[95, 85]}
        context='On sale 2 days'
      />
    )
    expect(container.querySelector('[data-slot=sparkline]')).toBeNull()
    expect(screen.getByText('On sale 2 days')).toBeInTheDocument()
  })
})
