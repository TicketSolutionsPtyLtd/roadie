import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StackedBars } from '.'
import { Chart } from '../Chart'
import { ticketMixExample } from './examples'

describe('StackedBars', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<StackedBars {...ticketMixExample} />)
    expect(html).toContain('var(--chart-trio-1)')
    expect(html).toContain(`aria-label="${ticketMixExample.takeaway}"`)
  })

  it('shows a legend and fills the card table', () => {
    render(
      <Chart label='Ticket types' source='Oztix sales.' size='md'>
        <StackedBars {...ticketMixExample} />
      </Chart>
    )
    expect(
      screen.getByText('Early bird', {
        selector: '[data-slot=chart-legend] li'
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Total' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy with nothing to stack', () => {
    render(<StackedBars data={[]} x='show' y='sold' series='type' />)
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument()
  })
})
