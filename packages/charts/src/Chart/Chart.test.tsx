import { useContext, useEffect } from 'react'

import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Chart } from '.'
import { CHART_TEXTURE_COUNT, chartTextureId } from '../ChartPatterns'
import { ChartCardContext } from './context'

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

  it('renders each texture id once for a card holding two plots', () => {
    const { container } = render(
      <Chart label='Sales' source='Oztix sales.' size='md'>
        <svg role='img' aria-label='Plot one' />
        <svg role='img' aria-label='Plot two' />
      </Chart>
    )
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      expect(
        container.querySelectorAll(`#${chartTextureId(slot)}`)
      ).toHaveLength(1)
  })
})

function ReportingPlot() {
  const card = useContext(ChartCardContext)
  useEffect(() => {
    card?.report({
      summary: 'Sales rose from 120 to 1,464',
      table: {
        columns: [{ key: 'day', header: 'Day', kind: 'text' }],
        rows: [{ day: 'Fri 27 Nov' }]
      }
    })
    return () => card?.report(null)
  }, [card])
  return <svg role='img' aria-label='Sales rose from 120 to 1,464' />
}

describe('Chart with a reporting plot', () => {
  it('builds the Table view from the plot with no table prop', () => {
    render(
      <Chart label='Sales' source='Oztix sales.' size='md'>
        <ReportingPlot />
      </Chart>
    )
    expect(screen.getByRole('table', { name: 'Sales' })).toHaveTextContent(
      'Fri 27 Nov'
    )
  })

  it('describes the card with the plot summary', () => {
    render(
      <Chart label='Sales' source='Oztix sales.' size='md'>
        <ReportingPlot />
      </Chart>
    )
    expect(
      screen.getByRole('region', { name: 'Sales' })
    ).toHaveAccessibleDescription('Sales rose from 120 to 1,464')
  })

  it('lets a table prop win over the reported table', () => {
    render(
      <Chart label='Sales' source='Oztix sales.' size='md' table={table}>
        <ReportingPlot />
      </Chart>
    )
    expect(screen.getByRole('table', { name: 'Sales' })).toHaveTextContent(
      'Days to show'
    )
  })

  it('hands the plot height for the card size down', () => {
    const heights: number[] = []
    function Probe() {
      heights.push(useContext(ChartCardContext)?.plotHeight ?? 0)
      return null
    }
    render(
      <Chart label='Sales' source='Oztix sales.' size='sm'>
        <Probe />
      </Chart>
    )
    expect(heights.at(-1)).toBe(160)
  })
})
