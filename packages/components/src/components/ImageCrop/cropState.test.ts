import { describe, expect, it } from 'vitest'

import {
  MAX_ZOOM_OVER_COVER,
  fitCrop,
  fitFrame,
  minCrop,
  panBy,
  sameCrop,
  transformOf,
  zoomTo
} from './cropState'

// A 2:1 frame 600px wide over a 2400 × 1600 image: cover zoom is 0.25.
const scene = {
  frame: { width: 600, height: 300 },
  image: { width: 2400, height: 1600 }
}
const start = fitCrop(undefined, scene)

describe('fitCrop', () => {
  it('centres the default and zooms it to cover the frame', () => {
    expect(start.area).toEqual({ x: 0, y: 200, width: 2400, height: 1200 })
    expect(start.zoom).toBe(0.25)
    expect(start.rotation).toBe(0)
  })

  it('keeps the area when the frame resizes, recomputing zoom', () => {
    const value = zoomTo(start, 0.5, scene)
    const half = fitCrop(value, {
      ...scene,
      frame: { width: 300, height: 150 }
    })
    expect(half.area).toEqual(value.area)
    expect(half.zoom).toBe(0.25)
  })

  it('pulls a value that runs off the image back inside it', () => {
    const outside = { ...start, area: { ...start.area, y: 900 } }
    expect(fitCrop(outside, scene).area.y).toBe(400)
  })
})

describe('panBy', () => {
  it('moves the area by natural pixels', () => {
    expect(panBy(start, 0, -40, scene).area.y).toBe(160)
  })

  it('stops at the edge so the image still covers the frame', () => {
    expect(panBy(start, 0, -1000, scene).area.y).toBe(0)
    expect(panBy(start, 500, 0, scene).area.x).toBe(0)
  })
})

describe('zoomTo', () => {
  it('zooms about the centre', () => {
    const value = zoomTo(start, 0.5, scene)
    expect(value.area).toEqual({ x: 600, y: 500, width: 1200, height: 600 })
  })

  it('keeps the point under an anchor still', () => {
    const anchor = { x: 300, y: 0 }
    const value = zoomTo(start, 0.5, scene, anchor)
    // The frame's right edge stays on natural x 2400.
    expect(value.area.x + value.area.width).toBe(2400)
  })

  it("won't zoom out past cover", () => {
    expect(zoomTo(start, 0.1, scene).zoom).toBe(0.25)
  })

  it('stops zooming in at the minimum crop', () => {
    const capped = { ...scene, min: minCrop(2, 1200) }
    const value = zoomTo(start, 4, capped)
    expect(value.area.width).toBe(1200)
    expect(value.zoom).toBe(0.5)
  })

  it(`stops at ${MAX_ZOOM_OVER_COVER}× cover with no minimum`, () => {
    expect(zoomTo(start, 100, scene).zoom).toBe(0.25 * MAX_ZOOM_OVER_COVER)
  })
})

describe('minCrop', () => {
  it('takes whichever side asks for more at the ratio', () => {
    expect(minCrop(2, 1200, 600)).toEqual({ width: 1200, height: 600 })
    expect(minCrop(2, undefined, 700)).toEqual({ width: 1400, height: 700 })
    expect(minCrop(10 / 3, 1000)).toEqual({ width: 1000, height: 300 })
    expect(minCrop(2)).toBeUndefined()
  })
})

describe('fitFrame', () => {
  it('fits the ratio inside the stage less its inset', () => {
    const stage = { width: 800, height: 600 }
    expect(fitFrame(stage, 2, 48)).toEqual({ width: 704, height: 352 })
    expect(fitFrame(stage, 1, 48)).toEqual({ width: 504, height: 504 })
  })
})

describe('transformOf', () => {
  it('moves the image opposite the crop, in screen pixels', () => {
    const value = panBy(start, 0, -200, scene)
    expect(transformOf(value, scene.image)).toBe(
      'translate3d(0px, 50px, 0) rotate(0deg) scale(0.25)'
    )
  })
})

describe('sameCrop', () => {
  it('ignores less than half a screen pixel', () => {
    // At zoom 0.25, 4 natural px are 1 screen px.
    expect(sameCrop(start, panBy(start, 0, -1, scene))).toBe(true)
    expect(sameCrop(start, panBy(start, 0, -4, scene))).toBe(false)
  })

  it('compares at the zoom on screen, not a stale one either side', () => {
    // A saved value carries whatever zoom it was given, here none.
    const saved = { ...start, zoom: 0 }
    const moved = panBy(start, 0, -40, scene)
    expect(sameCrop(saved, moved)).toBe(false)
    expect(sameCrop(moved, saved)).toBe(false)
  })
})
