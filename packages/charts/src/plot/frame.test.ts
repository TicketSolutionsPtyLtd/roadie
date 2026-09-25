import { describe, expect, it } from 'vitest'

import { MIN_FONT_SIZE, pixelsToX, plotFrame, widthBand } from './frame'

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

  it('converts pixels to x units across the plot inside the margins', () => {
    const frame = plotFrame(220, 'default', undefined, 640)
    expect(pixelsToX(frame, 14, [0, 100], 140)).toBeCloseTo(2.8, 5)
  })

  it('keeps a pixel length sane when margins outgrow a narrow frame', () => {
    const frame = plotFrame(160, 'narrow', undefined, 200)
    expect(pixelsToX(frame, 14, [0, 100], 400)).toBeCloseTo(14, 5)
  })
})
