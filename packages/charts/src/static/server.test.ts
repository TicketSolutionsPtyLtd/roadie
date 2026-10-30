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
