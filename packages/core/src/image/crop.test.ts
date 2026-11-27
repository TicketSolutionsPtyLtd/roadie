import { describe, expect, it } from 'vitest'

import {
  type CropRect,
  clampCrop,
  coverZoom,
  cropValueAt,
  rubberBand
} from './crop'

const frame = { width: 600, height: 300 }
const image = { width: 2400, height: 1600 }

describe('coverZoom', () => {
  it('covers a 600 × 300 frame with a 2400 × 1600 image at zoom 0.25', () => {
    expect(coverZoom(frame, image, 0)).toBe(0.25)
  })
})

describe('coverZoom when straightened', () => {
  it('needs more zoom at 4° to keep the corners covered', () => {
    expect(coverZoom(frame, image, 4)).toBeCloseTo(0.2581, 4)
  })

  it('covers the frame with the image on its side at a quarter turn', () => {
    expect(coverZoom(frame, image, 90)).toBe(0.375)
  })
})

describe('cropValueAt', () => {
  it.each([
    {
      rotation: 0,
      area: { x: 600, y: 200, width: 1200, height: 600 },
      percent: { x: 25, y: 12.5, width: 50, height: 37.5 }
    },
    {
      rotation: 90,
      area: { x: 200, y: 600, width: 1200, height: 600 },
      percent: { x: 12.5, y: 25, width: 75, height: 25 }
    }
  ])(
    'gives the percent of an area at $rotation° and back',
    ({ rotation, area, percent }) => {
      const fromArea = cropValueAt({ area }, frame, image, rotation)
      expect(fromArea).toEqual({ area, percent, zoom: 0.5, rotation })

      const fromPercent = cropValueAt({ percent }, frame, image, rotation)
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(fromPercent.area[key]).toBeCloseTo(area[key], 6)
      }
    }
  )

  it('fits an area of another shape inside the frame', () => {
    const whole = { x: 0, y: 0, width: 2400, height: 1600 }
    expect(cropValueAt({ area: whole }, frame, image).zoom).toBe(0.1875)
  })
})

const area = (x: number, y: number, width = 1200, height = 600) => ({
  x,
  y,
  width,
  height
})

describe('clampCrop', () => {
  it('zooms a crop that leaves the frame empty back in to cover it', () => {
    const whole = cropValueAt({ percent: area(0, 0, 100, 100) }, frame, image)
    const value = clampCrop({ ...whole, zoom: 0.1 }, frame, image)
    expect(value.zoom).toBe(0.25)
    expect(value.area).toEqual(area(0, 200, 2400, 1200))
  })

  it('pulls a crop that runs off the image back inside it', () => {
    const value = cropValueAt({ area: area(-100, 2000) }, frame, image)
    expect(clampCrop(value, frame, image).area).toEqual(area(0, 1000))
  })

  it('keeps the frame inside the image when it is straightened', () => {
    const rotation = 4
    const value = cropValueAt(
      { area: area(-500, -500) },
      frame,
      image,
      rotation
    )
    const clamped = clampCrop(value, frame, image)

    // A 2400 × 1600 image turned 4° has a 2505.764 × 1763.518 bounding box.
    const centre = { x: 2505.764 / 2, y: 1763.518 / 2 }
    const angle = (-rotation * Math.PI) / 180
    for (const corner of corners(clamped.area)) {
      const dx = corner.x - centre.x
      const dy = corner.y - centre.y
      const local = {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle)
      }
      expect(Math.abs(local.x)).toBeLessThanOrEqual(1200.001)
      expect(Math.abs(local.y)).toBeLessThanOrEqual(800.001)
    }
    expect(clamped.area.x).toBeGreaterThan(0)
  })

  it('leaves a crop that already fits alone at a quarter turn', () => {
    const value = cropValueAt({ area: area(100, 200) }, frame, image, 90)
    expect(clampCrop(value, frame, image).area).toEqual(area(100, 200))
  })

  it('keeps both sides of the crop at or above a minimum of another shape', () => {
    const value = cropValueAt({ area: area(900, 500, 600, 300) }, frame, image)
    const capped = clampCrop(value, frame, image, {
      min: { width: 1000, height: 1000 }
    })
    expect(capped.zoom).toBe(0.3)
    expect(capped.area.height).toBe(1000)
  })

  it('stops zooming in once the crop would fall below 1200 × 600', () => {
    const value = cropValueAt({ area: area(900, 500, 600, 300) }, frame, image)
    const capped = clampCrop(value, frame, image, {
      min: { width: 1200, height: 600 }
    })
    expect(capped.zoom).toBe(0.5)
    expect(capped.area).toEqual(area(600, 350))
  })

  it('still covers the frame when the image is smaller than the minimum', () => {
    const small = { width: 1000, height: 800 }
    const value = cropValueAt({ area: area(0, 0, 1000, 500) }, frame, small)
    const capped = clampCrop({ ...value, zoom: 2 }, frame, small, {
      min: { width: 1200, height: 600 }
    })
    expect(capped.zoom).toBe(0.6)
  })
})

describe('rubberBand', () => {
  it('lets a drag move freely up to the limit', () => {
    expect(rubberBand(80, 100, 400)).toBe(80)
    expect(rubberBand(-100, 100, 400)).toBe(-100)
  })

  it('resists a drag past the limit, in either direction', () => {
    expect(rubberBand(500, 100, 400)).toBeCloseTo(241.94, 2)
    expect(rubberBand(-500, 100, 400)).toBeCloseTo(-241.94, 2)
  })

  it('never stretches further than one dimension past the limit', () => {
    expect(rubberBand(1e9, 100, 400)).toBeLessThan(500)
  })
})

function corners(rect: CropRect) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height }
  ]
}
