import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { stackedBars } from '../StackedBars/definition'
import { ticketMixExample } from '../StackedBars/examples'
import { draw } from './draw'
import { plotFrame } from './frame'
import { hexPaint } from './paint'

const breaking = (reason: string) => ({
  ...stackedBars,
  build: () => {
    throw new Error(reason)
  }
})

const drawBroken = (reason: string) =>
  draw(
    breaking(reason),
    ticketMixExample,
    hexPaint('light'),
    plotFrame(220, 'default')
  )

function spyOnErrors() {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  onTestFinished(() => {
    error.mockRestore()
    vi.unstubAllEnvs()
  })
  return error
}

describe('draw', () => {
  it('draws nothing and reports once in development when a chart breaks', () => {
    const error = spyOnErrors()
    expect(drawBroken('bad stack')).toBeNull()
    drawBroken('bad stack')
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0]![0]).toBe(
      'Roadie could not draw a stacked-bars chart: bad stack'
    )
  })

  it('stays silent in production when a chart breaks', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const error = spyOnErrors()
    expect(drawBroken('bad scale')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })
})
