import { describe, expect, it } from 'vitest'

import {
  MIN_FONT_SIZE,
  besideAnchor,
  centredShift,
  pixelsToX,
  plotFrame,
  spanPixel,
  widthBand
} from './frame'

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

describe('label placement', () => {
  it('finds a point across the plotting area inside the margins', () => {
    const span = { width: 400, left: 40, right: 10 }
    expect(spanPixel(span, 0)).toBe(40)
    expect(spanPixel(span, 1)).toBe(390)
  })

  it('leaves a centred label alone when it fits', () => {
    expect(centredShift(200, 60, 400)).toBe(0)
  })

  it('slides a centred label in from either edge', () => {
    expect(centredShift(390, 60, 400)).toBe(-24)
    expect(centredShift(10, 60, 400)).toBe(24)
  })

  it('reads a side label to the right until it would leave the SVG', () => {
    expect(besideAnchor(300, 4, 80, 400)).toBe('start')
    expect(besideAnchor(312, 4, 80, 400)).toBe('start')
    expect(besideAnchor(313, 4, 80, 400)).toBe('end')
  })
})
