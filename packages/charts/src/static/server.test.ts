import { expect, it, vi } from 'vitest'

// A server component's React has no createContext or hooks, and /static is
// the server's way to draw a chart, so nothing it imports may reach for them.
vi.mock('react', () => ({}))

it('draws a chart without React, as a server component does', async () => {
  const { renderChartSvg, lineChart } = await import('.')
  const { paceExample } = await import('../LineChart/examples')
  expect(
    renderChartSvg(lineChart, paceExample, {
      mode: 'light',
      width: 640,
      height: 260
    })
  ).toMatch(/^<svg /)
})

it('draws a chart document without React', async () => {
  const { renderChartDocument } = await import('.')
  const { paceExample } = await import('../LineChart/examples')
  expect(
    renderChartDocument(
      {
        version: 1,
        kind: 'chart',
        label: 'Tickets sold',
        source: 'Oztix sales.',
        plot: { kind: 'line', ...paceExample }
      },
      { mode: 'light', width: 640, height: 360 }
    )
  ).toMatch(/^<svg /)
})
