import { describe, expect, it } from 'vitest'

import {
  MAX_ZOOM_OVER_COVER,
  dragCrop,
  fitCrop,
  fitFrame,
  minCrop,
  moveTo,
  panBy,
  rotateBy,
  sameCrop,
  straightenOf,
  stretchCrop,
  transformOf,
  zoomRange,
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

describe('zoomRange', () => {
  it(`runs from cover to ${MAX_ZOOM_OVER_COVER}× cover, or the minimum crop`, () => {
    expect(zoomRange(scene, 0)).toEqual({ cover: 0.25, max: 2, short: false })
    const capped = { ...scene, min: minCrop(2, 1200) }
    expect(zoomRange(capped, 0)).toEqual({
      cover: 0.25,
      max: 0.5,
      short: false
    })
  })

  it('stays at cover, and says so, for an image under the minimum', () => {
    const capped = { ...scene, min: minCrop(2, 3000) }
    expect(zoomRange(capped, 0)).toEqual({
      cover: 0.25,
      max: 0.25,
      short: true
    })
  })
})

describe('rotateBy', () => {
  it('turns a quarter left and zooms in to cover the turned image', () => {
    const value = rotateBy(start, -90, scene)
    expect(value.rotation).toBe(270)
    expect(value.zoom).toBe(0.375)
    expect(value.area).toEqual({ x: 0, y: 800, width: 1600, height: 800 })
  })

  it('keeps the spot under the frame, turned with the image', () => {
    const value = panBy(zoomTo(start, 0.5, scene), -600, 0, scene)
    expect(rotateBy(value, -90, scene).area).toEqual({
      x: 200,
      y: 1500,
      width: 1200,
      height: 600
    })
  })

  it('comes back to the start after four turns', () => {
    let value = start
    for (let turn = 0; turn < 4; turn++) value = rotateBy(value, -90, scene)
    expect(value.rotation).toBe(0)
    expect(sameCrop(value, start)).toBe(true)
  })

  it('reports a straighten in tenths without float noise', () => {
    const tilted = rotateBy(start, 9.7, scene)
    expect(tilted.rotation).toBe(9.7)
    expect(rotateBy(tilted, -4, scene).rotation).toBe(5.7)
    expect(rotateBy(start, -0.3, scene).rotation).toBe(359.7)
  })
})

describe('moveTo', () => {
  it('follows a drag without clamping it', () => {
    const value = moveTo(start, { x: 0, y: 0 }, { x: 100, y: 0 }, 1, scene)
    expect(value.area.x).toBe(-400)
  })

  it('keeps the point under a pinch midpoint as it zooms', () => {
    const point = { x: 100, y: 50 }
    const value = moveTo(start, point, point, 2, scene)
    expect(value.zoom).toBe(0.5)
    // The centre goes from 1200, 800 to 1400, 900.
    expect(value.area).toEqual({ x: 800, y: 600, width: 1200, height: 600 })
  })
})

describe('stretchCrop', () => {
  const stage = { width: 640, height: 480 }

  it('resists a drag past the edge, then clamps it', () => {
    const raw = moveTo(start, { x: 0, y: 0 }, { x: 100, y: 0 }, 1, scene)
    const { clamped, painted } = stretchCrop(raw, scene, stage)
    expect(clamped.area.x).toBe(0)
    // 100px over, at iOS's 0.55 resistance over a 640px stage, shows 50.6px.
    expect(painted.area.x).toBeCloseTo(-202.6, 1)
  })

  it('resists zooming out past cover', () => {
    const raw = moveTo(start, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.5, scene)
    const { clamped, painted } = stretchCrop(raw, scene, stage)
    expect(clamped.zoom).toBe(0.25)
    expect(painted.zoom).toBeCloseTo(0.2056, 4)
  })

  it('leaves a value inside the limits alone', () => {
    const { clamped, painted } = stretchCrop(start, scene, stage)
    expect(painted).toEqual(clamped)
  })
})

describe('straightenOf', () => {
  it.each([
    [0, 0],
    [3, 3],
    [357, -3],
    [270, 0],
    [273.5, 3.5],
    [44.9, 44.9],
    [45, 45],
    [135, -45],
    [315, -45],
    [180.1 + 0.2, 0.3]
  ])('reads %s° as %s° from the nearest quarter turn', (rotation, angle) => {
    expect(straightenOf(rotation)).toBeCloseTo(angle, 9)
  })
})

// Free-form: the frame takes the whole 3:2 image's shape inside 600 × 600.
const bounds = { width: 600, height: 600 }
const free = { ...scene, frame: { width: 600, height: 400 }, bounds }
const whole = fitCrop(undefined, free)

describe('minCrop in free-form', () => {
  it('keeps each side its own minimum', () => {
    expect(minCrop(undefined, 800)).toEqual({ width: 800, height: 0 })
    expect(minCrop(undefined, 800, 300)).toEqual({ width: 800, height: 300 })
    expect(minCrop(undefined)).toBeUndefined()
  })
})

describe('dragCrop', () => {
  const corner = { x: 1, y: 1 } as const
  const options = { minFrame: 88 }

  it('keeps the opposite corner on the image, and moves the frame off centre', () => {
    const { value, frame, offset } = dragCrop(
      whole,
      corner,
      { x: -100, y: -100 },
      free,
      options
    )
    expect(value.area).toEqual({ x: 0, y: 0, width: 2000, height: 1200 })
    expect(value.zoom).toBe(0.25)
    expect(frame).toEqual({ width: 500, height: 300 })
    expect(offset).toEqual({ x: -50, y: -50 })
  })

  it('resizes about the centre when centred', () => {
    const { value, offset } = dragCrop(
      whole,
      corner,
      { x: -100, y: -100 },
      free,
      { ...options, centred: true }
    )
    expect(value.area).toEqual({ x: 400, y: 400, width: 1600, height: 800 })
    expect(offset).toEqual({ x: 0, y: 0 })
  })

  it('moves one side from an edge', () => {
    const { value, offset } = dragCrop(
      whole,
      { x: 1, y: 0 },
      { x: -100, y: 50 },
      free,
      options
    )
    expect(value.area).toEqual({ x: 0, y: 0, width: 2000, height: 1600 })
    expect(offset).toEqual({ x: -50, y: 0 })
  })

  it('grows past the bounds by zooming out, as far as the image goes', () => {
    const area = { x: 0, y: 0, width: 1200, height: 800 }
    const zoomed = fitCrop({ ...whole, area }, free)
    expect(zoomed.zoom).toBe(0.5)
    const out = dragCrop(zoomed, corner, { x: 300, y: 0 }, free, options)
    expect(out.value.area).toEqual({ x: 0, y: 0, width: 1800, height: 800 })
    expect(out.value.zoom).toBeCloseTo(1 / 3)
    expect(out.frame.width).toBeCloseTo(600)
    const far = dragCrop(zoomed, corner, { x: 3000, y: 0 }, free, options)
    expect(far.value.area).toEqual({ x: 0, y: 0, width: 2400, height: 800 })
    expect(far.value.zoom).toBeCloseTo(0.25)
  })

  it('stops at the minimum, and at two handles wide on screen', () => {
    const far = { x: -1000, y: -1000 }
    const min = { width: 800, height: 400 }
    const small = dragCrop(whole, corner, far, { ...free, min }, options)
    expect(small.value.area).toEqual({ x: 0, y: 0, width: 800, height: 400 })
    const tiny = dragCrop(whole, corner, far, free, options)
    expect(tiny.frame).toEqual({ width: 88, height: 88 })
  })
})

describe('rotateBy in free-form', () => {
  it('turns the frame with a quarter turn, so the whole image still shows', () => {
    const turned = rotateBy(whole, -90, free)
    expect(turned.rotation).toBe(270)
    expect(turned.area.width).toBeCloseTo(1600)
    expect(turned.area.height).toBeCloseTo(2400)
  })

  it('keeps a zoomed-in crop the same size when the bounds are not square', () => {
    // 600 × 450 bounds: the 3:2 frame is 600 × 400, and turned it is 300 × 450.
    const wide = { ...free, bounds: { width: 600, height: 450 } }
    const zoomed = zoomTo(fitCrop(undefined, wide), 0.5, wide)
    expect(zoomed.area.width).toBeCloseTo(1200)
    const turned = rotateBy(zoomed, -90, wide)
    expect(turned.area.width).toBeCloseTo(800)
    expect(turned.area.height).toBeCloseTo(1200)
  })
})
