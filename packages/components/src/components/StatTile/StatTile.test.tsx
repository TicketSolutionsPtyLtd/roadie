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
  it('takes no controls, since a tile has no room for them', () => {
    render(
      // @ts-expect-error StatTile leaves out DataCard's controls
      <StatTile label='Tickets sold' value={180} controls={null} />
    )
  })
})

describe('StatTile decimal places', () => {
  it('reads the value and an inherited delta to the card’s places', () => {
    render(
      <StatTile
        label='Sold'
        value={0.0127}
        format='percent'
        decimals={2}
        delta={{ value: 0.0031 }}
      />
    )
    expect(screen.getByText('1.27%')).toBeInTheDocument()
    expect(screen.getByText(/^0\.31%$/)).toBeInTheDocument()
  })

  it('trims zeros from an inherited delta when the card does', () => {
    render(
      <StatTile
        label='Gross'
        value={3116}
        format='currency'
        trimZeros
        delta={{ value: 200 }}
      />
    )
    expect(screen.getByText('$3,116')).toBeInTheDocument()
    expect(screen.getByText(/^\$200$/)).toBeInTheDocument()
  })

  it('keeps a delta with its own format to its own places', () => {
    render(
      <StatTile
        label='Gross'
        value={3116}
        format='currency'
        trimZeros
        delta={{ value: 0.04, format: 'percent', decimals: 2 }}
      />
    )
    expect(screen.getByText(/^4\.00%$/)).toBeInTheDocument()
  })

  it('keeps a delta with its own format to its format’s places', () => {
    render(
      <StatTile
        label='Gross'
        value={3116.4}
        format='currency'
        decimals={0}
        delta={{ value: 0.042, format: 'percent' }}
      />
    )
    expect(screen.getByText('$3,116')).toBeInTheDocument()
    expect(screen.getByText(/^4\.2%$/)).toBeInTheDocument()
  })
})
