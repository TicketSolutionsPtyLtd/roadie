import { expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ dashboard: false }))

// A server component's React has no createContext or hooks, and /static is
// the server's way to draw a chart, so nothing it imports may reach for them.
vi.mock('react', () => ({}))

// The dashboard entry loads zod and every schema, which a server drawing one
// chart shouldn't pay for.
vi.mock('@oztix/roadie-core/dashboard', async (importOriginal) => {
  loaded.dashboard = true
  return importOriginal()
})

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

it('loads no dashboard schemas', async () => {
  await import('.')
  expect(loaded.dashboard).toBe(false)
})
