import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Chart } from '../Chart'
import { CHART_TEXTURE_COUNT } from '../ChartPatterns'
import { ChartPlot } from './ChartPlot'
import { brokenChart, testChart, testPoints } from './testChart'

const textureCount = (slot: number) =>
  document.querySelectorAll(`[id$='texture-${slot}']`).length

describe('ChartPlot', () => {
  it('names the plot with the takeaway', () => {
    const html = renderToString(
      <ChartPlot
        chart={testChart}
        props={{ points: testPoints, takeaway: 'B leads A' }}
      />
    )
    expect(html).toContain('aria-label="B leads A"')
    expect(html).toContain('role="img"')
    expect(html).toContain('var(--chart-')
  })

  it('shows the empty copy instead of a plot when there is too little data', () => {
    render(
      <ChartPlot chart={testChart} props={{ points: testPoints.slice(0, 1) }} />
    )
    expect(
      screen.getByText('Not enough data yet to show a trend')
    ).toHaveAttribute('data-slot', 'chart-empty')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('fills the card table from its own props', () => {
    render(
      <Chart label='Test' source='Oztix sales.' size='md'>
        <ChartPlot chart={testChart} props={{ points: testPoints }} />
      </Chart>
    )
    expect(
      screen.getByRole('table', { name: 'Test' }).querySelectorAll('tbody tr')
    ).toHaveLength(8)
  })

  it('does not report when told not to', () => {
    render(
      <Chart label='Test' source='Oztix sales.' size='md'>
        <ChartPlot
          chart={testChart}
          props={{ points: testPoints }}
          report={false}
        />
      </Chart>
    )
    expect(screen.queryByRole('table', { hidden: true })).toBeNull()
  })

  it('has a polite live region for spoken values', () => {
    render(<ChartPlot chart={testChart} props={{ points: testPoints }} />)
    expect(
      document.querySelector('[data-slot=chart-plot-announcement]')
    ).toHaveAttribute('aria-live', 'polite')
  })

  it('brings its own textures when there is no card', () => {
    render(<ChartPlot chart={testChart} props={{ points: testPoints }} />)
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      expect(textureCount(slot)).toBe(1)
  })

  it('leaves the textures to a card holding two plots', () => {
    render(
      <Chart label='Test' source='Oztix sales.' size='md'>
        <ChartPlot chart={testChart} props={{ points: testPoints }} />
        <ChartPlot
          chart={testChart}
          props={{ points: testPoints }}
          report={false}
        />
      </Chart>
    )
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      expect(textureCount(slot)).toBe(1)
  })
})

describe('ChartPlot when the chart cannot draw', () => {
  it('shows the error copy instead of throwing on the server', () => {
    let html = ''
    expect(() => {
      html = renderToString(
        <ChartPlot chart={brokenChart} props={{ points: testPoints }} />
      )
    }).not.toThrow()
    expect(html).toContain('data-slot="chart-error"')
  })

  it('puts its card in the error state', () => {
    render(
      <Chart label='Tickets sold' source='Oztix sales.' size='md'>
        <ChartPlot chart={brokenChart} props={{ points: testPoints }} />
      </Chart>
    )
    const card = document.querySelector("[data-slot='data-card']")
    expect(card).toHaveAttribute('data-state', 'error')
    expect(card).toHaveTextContent("We couldn't load tickets sold")
  })
})
