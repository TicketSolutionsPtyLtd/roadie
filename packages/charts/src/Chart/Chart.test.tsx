import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Chart } from '.'

const table = {
  columns: [
    { key: 'day', header: 'Days to show', kind: 'number' as const },
    {
      key: 'sold',
      header: 'Sold',
      kind: 'number' as const,
      format: 'percent' as const
    }
  ],
  rows: [{ day: 30, sold: 0.61 }]
}

const renderChart = (view?: 'chart' | 'table') =>
  render(
    <Chart
      label='Sales pace'
      value={0.61}
      format='percent'
      source='Oztix sales. 38 similar shows.'
      table={table}
      size='lg'
      view={view}
    >
      <svg role='img' aria-label='Pace chart' />
    </Chart>
  )

describe('Chart', () => {
  it('renders the card, plot and source', () => {
    renderChart()
    expect(
      screen.getByRole('region', { name: 'Sales pace' })
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pace chart' })).toBeInTheDocument()
    expect(
      screen.getByText('Oztix sales. 38 similar shows.')
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Chart' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('opens on the table when asked', () => {
    renderChart('table')
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('cell', { name: '61%' })).toBeInTheDocument()
  })

  it('server renders both views', () => {
    const html = renderToString(
      <Chart
        label='Sales pace'
        source='Oztix sales.'
        table={table}
        takeaway='Ahead of similar shows'
      >
        <svg aria-label='Pace chart' />
      </Chart>
    )
    expect(html).toContain('Pace chart')
    expect(html).toContain('Days to show')
  })

  it('places its size on the grid child', () => {
    const { container } = renderChart()
    expect(container.firstElementChild).toHaveAttribute('data-size', 'lg')
  })
})
