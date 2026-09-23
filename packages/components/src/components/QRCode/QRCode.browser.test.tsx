import { cleanup, render } from '@testing-library/react'
import jsQR from 'jsqr'
import { afterEach, describe, expect, it } from 'vitest'

import { QRCode } from '.'

const PIXELS_PER_MODULE = 8

afterEach(() => cleanup())

async function rasterise(svg: SVGSVGElement) {
  const [, , modules] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  const size = modules! * PIXELS_PER_MODULE
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size))

  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(clone)
  )}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0, size, size)
  return { pixels: context.getImageData(0, 0, size, size).data, size }
}

async function decode(ui: React.ReactElement) {
  const { container } = render(ui)
  const svg = container.querySelector<SVGSVGElement>('[data-slot=qr-code]')!
  const { pixels, size } = await rasterise(svg)
  return jsQR(pixels, size, size)?.data
}

const StarMark = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z' />
  </svg>
)

describe('QRCode rendered pixels', () => {
  it.each(['YX6R', 'A7K2MKWX', 'A7K2MKWX9Q'])(
    'decodes %s with the Oztix mark',
    async (value) => {
      expect(await decode(<QRCode value={value} />)).toBe(value)
    }
  )

  it.each(['YX6R', 'A7K2MKWX', 'A7K2MKWX9Q'])(
    'decodes %s with a custom mark',
    async (value) => {
      expect(
        await decode(
          <QRCode value={value}>
            <StarMark />
          </QRCode>
        )
      ).toBe(value)
    }
  )

  it.each(['YX6R', 'A7K2MKWX'])('decodes %s plain', async (value) => {
    expect(await decode(<QRCode value={value} branded={false} />)).toBe(value)
  })
})
