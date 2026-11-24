import { describe, expect, it } from 'vitest'

import { cropImage, cropValueAt } from '@oztix/roadie-core/image'

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
