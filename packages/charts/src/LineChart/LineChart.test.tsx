import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LineChart } from '.'
import { Chart } from '../Chart'
import { paceExample } from './examples'

describe('LineChart', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<LineChart {...paceExample} />)
    expect(html).toContain('var(--chart-highlight)')
    expect(html).toContain(`aria-label="${paceExample.takeaway}"`)
  })

  it('gives the card its table', () => {
    render(
      <Chart label='Sales pace' source='Oztix sales.' size='full'>
        <LineChart {...paceExample} />
      </Chart>
    )
    expect(
      screen.getByRole('columnheader', { name: 'Similar shows range' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy for a single point', () => {
    render(
      <LineChart data={[{ day: '2026-10-01', sold: 1 }]} x='day' y='sold' />
    )
    expect(
      screen.getByText('Not enough data yet to show a trend')
    ).toBeInTheDocument()
  })
})
