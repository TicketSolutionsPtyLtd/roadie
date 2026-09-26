import { useContext, useEffect } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Chart } from '.'
import { CHART_TEXTURE_COUNT } from '../ChartPatterns'
import { ChartCardContext } from './context'

const textureCount = (container: HTMLElement, slot: number) =>
  container.querySelectorAll(`[id$='texture-${slot}']`).length

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
      screen.getByRole('article', { name: 'Sales pace' })
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pace chart' })).toBeInTheDocument()
    expect(
      screen.getByText('Oztix sales. 38 similar shows.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('opens on the table when asked', () => {
    renderChart('table')
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('cell', { name: '61%' })).toBeInTheDocument()
  })

  it('switches views with a toggle that controls the view area', () => {
    const { container } = renderChart()
    const views = container.querySelector('[data-slot=chart-views]')!
    const chartView = container.querySelector('[data-chart-view=chart]')!
    const tableView = container.querySelector('[data-chart-view=table]')!
    const chart = screen.getByRole('button', { name: 'Chart' })
    const tableButton = screen.getByRole('button', { name: 'Table' })
    expect(views.id).not.toBe('')
    for (const item of [chart, tableButton])
      expect(item).toHaveAttribute('aria-controls', views.id)
    expect(tableView).toHaveAttribute('inert')
    expect(chartView).not.toHaveAttribute('inert')

    fireEvent.click(tableButton)
    expect(tableButton).toHaveAttribute('aria-pressed', 'true')
    expect(chartView).toHaveAttribute('inert')
    expect(tableView).not.toHaveAttribute('inert')
    expect(screen.getByRole('table', { name: 'Sales pace' })).toBeVisible()
  })

  it('always keeps one view selected', () => {
    renderChart()
    const chart = screen.getByRole('button', { name: 'Chart' })
    fireEvent.click(chart)
    expect(chart).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('has no tab roles', () => {
    renderChart()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByRole('tabpanel')).toBeNull()
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
      expect(textureCount(container, slot)).toBe(1)
  })

  it('scopes its texture ids so two cards on one page never collide', () => {
    const { container } = render(
      <>
        <Chart label='Sales' source='Oztix sales.' size='md'>
          <svg role='img' aria-label='Plot one' />
        </Chart>
        <Chart label='Orders' source='Oztix sales.' size='md'>
          <svg role='img' aria-label='Plot two' />
        </Chart>
      </>
    )
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toHaveLength(new Set(ids).size)
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      expect(textureCount(container, slot)).toBe(2)
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

describe('Chart actions', () => {
  const more = <button type='button'>More actions for Sales pace</button>

  it('renders actions after the view switch', () => {
    const { container } = render(
      <Chart label='Sales pace' source='Oztix sales.' actions={more}>
        <svg role='img' aria-label='Pace chart' />
      </Chart>
    )
    const slot = container.querySelector('[data-slot=data-card-actions]')!
    const [views, action] = [...slot.children]
    expect(views).toHaveAttribute('role', 'group')
    expect(views).toHaveAccessibleName('Sales pace view')
    expect(action).toHaveTextContent('More actions for Sales pace')
  })

  it('keeps actions but drops the view switch without data', () => {
    for (const state of ['loading', 'empty', 'error'] as const) {
      const { unmount } = render(
        <Chart
          label='Sales pace'
          source='Oztix sales.'
          state={state}
          actions={more}
        >
          <svg role='img' aria-label='Pace chart' />
        </Chart>
      )
      expect(
        screen.queryByRole('group', { name: 'Sales pace view' })
      ).toBeNull()
      expect(
        screen.getByRole('button', { name: 'More actions for Sales pace' })
      ).toBeInTheDocument()
      unmount()
    }
  })
})

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
      screen.getByRole('article', { name: 'Sales' })
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

describe('Chart when its plot throws', () => {
  function Broken(): never {
    throw new Error('No scale range')
  }

  it('shows its own error state and leaves the page standing', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <Chart label='Tickets sold' source='Oztix sales.' size='md'>
          <Broken />
        </Chart>
        <p>Rest of the dashboard</p>
      </>
    )
    quiet.mockRestore()
    expect(document.querySelector("[data-slot='data-card']")).toHaveAttribute(
      'data-state',
      'error'
    )
    expect(screen.getByText(/We couldn't load tickets sold/)).toBeVisible()
    expect(screen.getByText('Rest of the dashboard')).toBeInTheDocument()
  })

  it('draws again once the plot it failed on changes', () => {
    function Plot({ broken }: { broken: boolean }) {
      if (broken) throw new Error('No scale range')
      return <p>Drawn</p>
    }
    const card = (broken: boolean) => (
      <Chart label='Tickets sold' source='Oztix sales.' size='md'>
        <Plot broken={broken} />
      </Chart>
    )
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(card(true))
    rerender(card(true))
    quiet.mockRestore()
    expect(document.querySelector("[data-slot='data-card']")).toHaveAttribute(
      'data-state',
      'error'
    )
    rerender(card(false))
    expect(
      document.querySelector("[data-slot='data-card']")
    ).not.toHaveAttribute('data-state', 'error')
    expect(screen.getByText('Drawn')).toBeInTheDocument()
  })
})
