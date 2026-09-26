import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Scatter } from '.'
import { Chart } from '../Chart'
import { portfolioExample } from './examples'

describe('Scatter', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<Scatter {...portfolioExample} />)
    expect(html).toContain('var(--chart-highlight)')
    expect(html).toContain('var(--chart-context)')
    expect(html).toContain(`aria-label="${portfolioExample.takeaway}"`)
  })

  it('names the plot and fills the card table', () => {
    render(
      <Chart label='Portfolio' source='Oztix sales.' size='lg'>
        <Scatter {...portfolioExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: portfolioExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('table', { name: 'Portfolio' })
        .querySelectorAll('tbody tr')
    ).toHaveLength(6)
  })

  it.each([[[]], [[{ a: 1, b: 2 }]]])('shows the empty copy for %j', (data) => {
    render(<Scatter data={data} x='a' y='b' />)
    expect(
      screen.getByText('Not enough data yet to compare')
    ).toBeInTheDocument()
  })
})
