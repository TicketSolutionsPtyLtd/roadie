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
