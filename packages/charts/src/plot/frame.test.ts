import { describe, expect, it } from 'vitest'

import { MIN_FONT_SIZE, plotFrame, widthBand } from './frame'

describe('plot frame', () => {
  it('bands widths like the card container queries', () => {
    expect(widthBand(320)).toBe('narrow')
    expect(widthBand(479)).toBe('narrow')
    expect(widthBand(480)).toBe('default')
    expect(widthBand(960)).toBe('wide')
  })

  it('never sets text under 11px', () => {
    for (const band of ['narrow', 'default', 'wide'] as const)
      for (const height of [120, 160, 220, 260])
        expect(plotFrame(height, band).fontSize).toBeGreaterThanOrEqual(
          MIN_FONT_SIZE
        )
  })

  it('carries a shared y domain through', () => {
    expect(plotFrame(160, 'narrow', [0, 10]).yDomain).toEqual([0, 10])
  })
})
