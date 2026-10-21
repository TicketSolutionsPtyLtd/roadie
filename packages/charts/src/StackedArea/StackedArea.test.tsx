import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StackedArea } from '.'
import { Chart } from '../Chart'
import { scansByGateExample } from './examples'

describe('StackedArea', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<StackedArea {...scansByGateExample} />)
    expect(html).toContain('var(--chart-1)')
    expect(html).toContain(`aria-label="${scansByGateExample.takeaway}"`)
  })

  it('shows a legend and fills the card table', () => {
    render(
      <Chart label='Scans by gate' source='Oztix scans.' size='md'>
        <StackedArea {...scansByGateExample} />
      </Chart>
    )
    expect(
      screen.getByText('Box office', {
        selector: '[data-slot=chart-legend] li'
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Total' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy with nothing to stack', () => {
    render(<StackedArea data={[]} x='at' y='scans' series='gate' />)
    expect(
      screen.getByText('Not enough data yet to show a trend')
    ).toBeInTheDocument()
  })
})
