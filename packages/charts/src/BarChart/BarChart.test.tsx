import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BarChart } from '.'
import { Chart } from '../Chart'
import { scanRateExample } from './examples'

describe('BarChart', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<BarChart {...scanRateExample} />)
    expect(html).toContain('var(--chart-1)')
    expect(html).toContain(`aria-label="${scanRateExample.takeaway}"`)
  })

  it('names the plot and fills the card table', () => {
    render(
      <Chart label='Entry' source='Oztix scans.' size='full'>
        <BarChart {...scanRateExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: scanRateExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Inside' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy when no bar has a value', () => {
    render(
      <BarChart
        data={[{ day: '2026-10-01', orders: null }]}
        x='day'
        y='orders'
      />
    )
    expect(
      screen.getByText('Nothing to show for this period yet')
    ).toBeInTheDocument()
  })

  it('shows the empty copy for no rows', () => {
    render(<BarChart data={[]} x='day' y='orders' />)
    expect(
      screen.getByText('Nothing to show for this period yet')
    ).toBeInTheDocument()
  })
})
