import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Histogram } from '.'
import { Chart } from '../Chart'
import { leadTimeExample, orderSizeExample } from './examples'

describe('Histogram', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<Histogram {...leadTimeExample} />)
    expect(html).toContain('var(--chart-1)')
    expect(html).toContain(`aria-label="${leadTimeExample.takeaway}"`)
  })

  it('names the plot and fills the card table', () => {
    render(
      <Chart label='Order size' source='Oztix sales.' size='md'>
        <Histogram {...orderSizeExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: orderSizeExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Count' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy for a single value', () => {
    render(<Histogram data={[{ days: 3 }]} x='days' />)
    expect(
      screen.getByText('Not enough data yet to show a spread')
    ).toBeInTheDocument()
  })

  it('shows the empty copy for no data', () => {
    render(<Histogram data={[]} x='days' median />)
    expect(
      screen.getByText('Not enough data yet to show a spread')
    ).toBeInTheDocument()
  })
})
