import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DonutChart } from '.'
import { Chart } from '../Chart'
import { ticketTypeExample } from './examples'

describe('DonutChart', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<DonutChart {...ticketTypeExample} />)
    expect(html).toContain('var(--chart-1)')
    expect(html).toContain(`aria-label="${ticketTypeExample.takeaway}"`)
  })

  it('names the plot and fills the card table with a total row', () => {
    render(
      <Chart label='Tickets by type' source='Oztix sales.' size='md'>
        <DonutChart {...ticketTypeExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: ticketTypeExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Share' })
    ).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('names every part with its value and share in the legend', () => {
    render(<DonutChart {...ticketTypeExample} />)
    expect(screen.getByText('GA 1,240 (52%)')).toBeInTheDocument()
    expect(screen.getByText('Companion 95 (4%)')).toBeInTheDocument()
  })

  it('shows the empty copy without a positive value', () => {
    render(
      <DonutChart data={[{ type: 'GA', tickets: 0 }]} x='type' y='tickets' />
    )
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument()
  })
})
