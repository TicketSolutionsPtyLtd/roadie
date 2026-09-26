import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChartLegend } from '.'

describe('ChartLegend', () => {
  it('lists items with keys that match their marks', () => {
    const { container } = render(
      <ChartLegend
        items={[
          { label: 'This show', shape: 'line' },
          { label: 'Similar shows', shape: 'band', color: 'var(--chart-band)' },
          { label: 'Forecast', shape: 'dot' }
        ]}
      />
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(container.querySelector('[data-shape=band] rect')).toHaveAttribute(
      'fill',
      'var(--chart-band)'
    )
    expect(container.querySelector('[data-shape=dot] line')).toHaveAttribute(
      'stroke-dasharray',
      '0.5 3'
    )
  })
})

describe('ChartLegend band key', () => {
  it('draws a dashed median through the band when asked', () => {
    const { container } = render(
      <ChartLegend
        items={[
          {
            label: 'Similar shows',
            shape: 'band',
            color: 'var(--chart-band)',
            median: true
          }
        ]}
      />
    )
    const key = container.querySelector('[data-shape=band]')!
    expect(key.querySelector('rect')).toHaveAttribute(
      'fill',
      'var(--chart-band)'
    )
    expect(key.querySelector('line')).toHaveAttribute(
      'stroke',
      'var(--chart-median)'
    )
    expect(key.querySelector('line')).toHaveAttribute('stroke-dasharray', '3 3')
  })

  it('draws the band alone without a median', () => {
    const { container } = render(
      <ChartLegend items={[{ label: 'Similar shows', shape: 'band' }]} />
    )
    expect(container.querySelector('[data-shape=band] line')).toBeNull()
  })
})

describe('ChartLegend keys for forced colours and print', () => {
  it('marks swatches with their texture and lines with their dash', () => {
    const { container } = render(
      <ChartLegend
        items={[
          { label: 'GA', shape: 'swatch', slot: 1 },
          { label: 'Other', shape: 'swatch', slot: 0 },
          { label: 'VIP', shape: 'line', slot: 2 }
        ]}
      />
    )
    const [ga, other] = container.querySelectorAll('rect')
    expect(ga).toHaveAttribute('data-chart-texture', '1')
    expect(other).toHaveAttribute('data-chart-texture', '8')
    expect(container.querySelector('line')).toHaveAttribute(
      'data-chart-dash',
      '2'
    )
  })
})
