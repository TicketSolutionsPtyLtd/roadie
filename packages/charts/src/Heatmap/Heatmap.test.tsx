import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Heatmap } from '.'
import { Chart } from '../Chart'
import { sectionPaceExample, whenFansBuyExample } from './examples'

describe('Heatmap', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<Heatmap {...whenFansBuyExample} />)
    expect(html).toContain('var(--chart-heat-8)')
    expect(html).toContain(`aria-label="${whenFansBuyExample.takeaway}"`)
    expect(renderToString(<Heatmap {...sectionPaceExample} />)).toContain(
      'var(--chart-diverge-pos-4)'
    )
  })

  it('names the plot and fills the card table', () => {
    render(
      <Chart label='When fans buy' source='Oztix sales, venue time.' size='lg'>
        <Heatmap {...whenFansBuyExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: whenFansBuyExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('table', { name: 'When fans buy' })
        .querySelectorAll('tbody tr')
    ).toHaveLength(7)
  })

  it('shows the empty copy with no values', () => {
    render(<Heatmap data={[]} rows='r' columns='c' value='v' />)
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument()
  })
})
