import { describe, expect, it, vi } from 'vitest'

import { clampCrop, cropValueAt } from './crop'
import { cropImage } from './cropImage'

// A 200 × 100 PNG in four colours: red, green across the top; blue, yellow
// across the bottom.
const QUADRANTS = [
  ['#ff0000', 0, 0],
  ['#00ff00', 100, 0],
  ['#0000ff', 0, 50],
  ['#ffff00', 100, 50]
] as const

async function fourColours() {
  const canvas = new OffscreenCanvas(200, 100)
  const context = canvas.getContext('2d')!
  for (const [colour, x, y] of QUADRANTS) {
    context.fillStyle = colour
    context.fillRect(x, y, 100, 50)
  }
  return canvas.convertToBlob({ type: 'image/png' })
}

/** The blob's size and the colour near each corner, as `r,g,b`. */
async function corners(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, 0, 0)
  const at = (x: number, y: number) =>
    [...context.getImageData(x, y, 1, 1).data.slice(0, 3)].join()
  const inset = 4
  return {
    width,
    height,
    topLeft: at(inset, inset),
    topRight: at(width - inset, inset),
    bottomRight: at(width - inset, height - inset),
    bottomLeft: at(inset, height - inset)
  }
}

const RED = '255,0,0'
const GREEN = '0,255,0'
const BLUE = '0,0,255'
const YELLOW = '255,255,0'
const image = { width: 200, height: 100 }

describe('cropImage', () => {
  it('turns the image 90° clockwise', async () => {
    const value = cropValueAt(
      { area: { x: 0, y: 0, width: 100, height: 200 } },
      { width: 100, height: 200 },
      image,
      90
    )
    const blob = await cropImage(await fourColours(), value)
    expect(blob.type).toBe('image/png')
    expect(await corners(blob)).toEqual({
      width: 100,
      height: 200,
      topLeft: BLUE,
      topRight: RED,
      bottomRight: GREEN,
      bottomLeft: YELLOW
    })
  })

  it('draws on a canvas element where there is no OffscreenCanvas', async () => {
    const source = await fourColours()
    vi.stubGlobal('OffscreenCanvas', undefined)
    let blob: Blob
    try {
      blob = await cropImage(
        source,
        cropValueAt(
          { area: { x: 0, y: 0, width: 100, height: 200 } },
          { width: 100, height: 200 },
          image,
          90
        )
      )
    } finally {
      vi.unstubAllGlobals()
    }
    expect((await corners(blob)).topLeft).toBe(BLUE)
  })

  it('crops an image from a URL', async () => {
    const url = URL.createObjectURL(await fourColours())
    try {
      const value = cropValueAt(
        { area: { x: 0, y: 50, width: 100, height: 50 } },
        { width: 100, height: 50 },
        image
      )
      expect((await corners(await cropImage(url, value))).topLeft).toBe(BLUE)
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  it('makes at least a pixel each way from a thin crop', async () => {
    const value = cropValueAt(
      { area: { x: 0, y: 0, width: 200, height: 0.2 } },
      { width: 200, height: 0.2 },
      image
    )
    const bitmap = await createImageBitmap(
      await cropImage(await fourColours(), value, { width: 10.6 })
    )
    expect([bitmap.width, bitmap.height]).toEqual([11, 1])
  })

  it('turns the image upside down', async () => {
    const value = cropValueAt(
      { area: { x: 0, y: 0, width: 200, height: 100 } },
      { width: 200, height: 100 },
      image,
      180
    )
    const { topLeft, topRight, bottomRight, bottomLeft } = await corners(
      await cropImage(await fourColours(), value)
    )
    expect({ topLeft, topRight, bottomRight, bottomLeft }).toEqual({
      topLeft: YELLOW,
      topRight: BLUE,
      bottomRight: RED,
      bottomLeft: GREEN
    })
  })

  it('crops to the area', async () => {
    const value = cropValueAt(
      { area: { x: 100, y: 0, width: 100, height: 50 } },
      { width: 100, height: 50 },
      image
    )
    const { width, height, topLeft, bottomRight } = await corners(
      await cropImage(await fourColours(), value)
    )
    expect({ width, height, topLeft, bottomRight }).toEqual({
      width: 100,
      height: 50,
      topLeft: GREEN,
      bottomRight: GREEN
    })
  })

  it('scales to a width, keeping the ratio, in the type asked for', async () => {
    const value = cropValueAt(
      { area: { x: 0, y: 0, width: 200, height: 100 } },
      { width: 200, height: 100 },
      image
    )
    const blob = await cropImage(await fourColours(), value, {
      width: 50,
      type: 'image/jpeg',
      quality: 0.9
    })
    expect(blob.type).toBe('image/jpeg')
    const { width, height } = await corners(blob)
    expect({ width, height }).toEqual({ width: 50, height: 25 })
  })
})

/** A source that's white all over, so any darker pixel came from the crop. */
async function white() {
  const canvas = new OffscreenCanvas(640, 427)
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 640, 427)
  return canvas.convertToBlob({ type: 'image/png' })
}

/** The pixels on the blob's outermost edge, each as its darkest channel. */
async function edge(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, 0, 0)
  const { data } = context.getImageData(0, 0, width, height)
  const pixels: number[] = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) continue
      const i = (y * width + x) * 4
      pixels.push(Math.min(data[i]!, data[i + 1]!, data[i + 2]!))
    }
  return pixels
}

describe('cropImage to an opaque type', () => {
  // Scaled down from a turned image, the edge pixels sample past its corners,
  // which every engine showed as a dark hairline on a 16:9 crop at 33°.
  const frame = { width: 16, height: 9 }
  const photo = { width: 640, height: 427 }
  const straightened = clampCrop(
    cropValueAt(
      { percent: { x: 0, y: 0, width: 100, height: 100 } },
      frame,
      photo,
      33
    ),
    frame,
    photo
  )
  const jpeg = { width: 97, type: 'image/jpeg', quality: 1 }

  it('leaves no dark hairline where a straightened crop meets the image edge', async () => {
    const blob = await cropImage(await white(), straightened, jpeg)
    expect(blob.type).toBe('image/jpeg')
    expect(Math.min(...(await edge(blob)))).toBeGreaterThanOrEqual(250)
  })

  // The whole turned box, so its corners are past the image.
  const turned = cropValueAt(
    { percent: { x: 0, y: 0, width: 100, height: 100 } },
    frame,
    photo,
    33
  )

  /** The colour at the blob's top-left pixel, as `r,g,b,a`. */
  async function topLeft(blob: Blob) {
    const bitmap = await createImageBitmap(blob)
    const context = new OffscreenCanvas(1, 1).getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    return [...context.getImageData(0, 0, 1, 1).data].join()
  }

  it('fills past the image with white', async () => {
    expect(await topLeft(await cropImage(await white(), turned, jpeg))).toBe(
      '255,255,255,255'
    )
  })

  it('fills past the image with the background asked for', async () => {
    const blob = await cropImage(await white(), turned, {
      ...jpeg,
      background: '#000000'
    })
    expect(await topLeft(blob)).toBe('0,0,0,255')
  })

  it('leaves a type with alpha see-through past the image', async () => {
    const blob = await cropImage(await white(), turned, {
      width: 97,
      type: 'image/png'
    })
    expect(await topLeft(blob)).toBe('0,0,0,0')
  })
})
