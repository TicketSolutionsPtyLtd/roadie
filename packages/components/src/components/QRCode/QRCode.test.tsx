import { render, screen } from '@testing-library/react'
import jsQR from 'jsqr'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { QRCode, type QRCodeProps } from '.'
import * as barrel from '../../index'
import type { QRCodeProps as BarrelQRCodeProps } from '../../index'
import { getQRMatrix } from './getQRMatrix'
import { getTile, isInTile } from './tile'

const PIXELS_PER_MODULE = 8
const QUIET_ZONE = 4

const BYTE_MODE_60 =
  'https://tickets.example.com/t/a7k2mkwx?ref=roadie-qr-60-chars!'.slice(0, 60)
const VALUES = ['YX6R', 'A7K2MKWX', 'A7K2MKWX9Q', BYTE_MODE_60]
const LONG_VALUE = 'x'.repeat(80)

function rasterise(value: string, branded: boolean) {
  const matrix = getQRMatrix(value)
  const tile = branded ? getTile(matrix).tile : null
  const modules = matrix.size + QUIET_ZONE * 2
  const width = modules * PIXELS_PER_MODULE
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255)

  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.dark(row, col) && !isInTile(tile, row, col)) continue
      for (let y = 0; y < PIXELS_PER_MODULE; y++) {
        for (let x = 0; x < PIXELS_PER_MODULE; x++) {
          const px = (col + QUIET_ZONE) * PIXELS_PER_MODULE + x
          const py = (row + QUIET_ZONE) * PIXELS_PER_MODULE + y
          pixels.fill(13, (py * width + px) * 4, (py * width + px) * 4 + 3)
        }
      }
    }
  }

  return { pixels, width }
}

function fills(svg: Element) {
  return [...svg.querySelectorAll('rect, [data-slot^=qr-code-]')].map(
    (el) => (el as SVGElement).style.fill
  )
}

describe('QRCode', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('round-trip decode', () => {
    it.each(
      VALUES.flatMap((value) => [
        [value, true] as const,
        [value, false] as const
      ])
    )('decodes %j (branded: %s) back to the value', (value, branded) => {
      const { pixels, width } = rasterise(value, branded)
      expect(jsQR(pixels, width, width)?.data).toBe(value)
    })
  })

  it('renders an svg image with the default label', () => {
    render(<QRCode value='A7K2MKWX' />)
    const svg = screen.getByRole('img', { name: 'QR code' })

    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('data-slot', 'qr-code')
    expect(svg).toHaveClass('block', 'w-full', 'h-auto', 'aspect-square')
  })

  it('takes a consumer aria-label and className', () => {
    render(
      <QRCode
        value='A7K2MKWX'
        aria-label='Ticket QR code for Adult Pass'
        className='max-w-60'
      />
    )
    const svg = screen.getByRole('img', {
      name: 'Ticket QR code for Adult Pass'
    })
    expect(svg).toHaveClass('max-w-60', 'w-full')
  })

  it('sizes the viewBox in modules with a 4-module quiet zone', () => {
    const { container } = render(<QRCode value='A7K2MKWX' />)
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 29 29'
    )
  })

  it('draws the branded tile over the centre 5×5 modules, in the same path', () => {
    const { container } = render(<QRCode value='A7K2MKWX' />)
    const d = container
      .querySelector('[data-slot=qr-code-modules]')!
      .getAttribute('d')!

    expect(d.endsWith('M12 12h5v5h-5z')).toBe(true)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
    expect(container.querySelector('[data-slot=qr-code-mark]')).toBeTruthy()
  })

  it('draws the Oztix mark by default and a custom mark from children', () => {
    const { container, rerender } = render(<QRCode value='A7K2MKWX' />)
    const mark = () => container.querySelector('[data-slot=qr-code-mark]')!

    expect(mark().querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48')
    expect(mark()).toHaveAttribute('x', '12.8')
    expect(mark()).toHaveAttribute('width', '3.4')

    rerender(
      <QRCode value='A7K2MKWX'>
        <svg data-testid='custom' viewBox='0 0 24 24' />
      </QRCode>
    )
    expect(mark().querySelector('[data-testid=custom]')).toBeTruthy()
    expect(mark().querySelectorAll('svg')).toHaveLength(1)
  })

  it('renders no tile or mark when branded is false', () => {
    const { container } = render(
      <QRCode value='A7K2MKWX' branded={false}>
        <svg viewBox='0 0 24 24' />
      </QRCode>
    )

    expect(container.querySelector('[data-slot=qr-code-mark]')).toBeNull()
    expect(container.querySelector('path')!.getAttribute('d')).not.toContain(
      'h5v5'
    )
    expect(container.querySelector('svg')).not.toHaveAttribute('data-branded')
  })

  it('draws modules as full-cell runs', () => {
    const { container } = render(<QRCode value='A7K2MKWX' branded={false} />)
    const d = container.querySelector('path')!.getAttribute('d')!

    expect(d).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/)
    expect(d.startsWith('M4 4h7v1h-7z')).toBe(true)
  })

  it('fills only with the fixed light neutral tokens', () => {
    const { container } = render(<QRCode value='A7K2MKWX' />)
    const svg = container.querySelector('svg')!

    for (const fill of fills(svg)) {
      expect(fill).toMatch(
        /^var\(--color-neutral-light-(0|13), #[0-9a-f]{6}\)$/
      )
    }
    expect(fills(svg)).toHaveLength(3)
  })

  describe('plain fallback', () => {
    it('renders plain when the tile would cover an alignment pattern', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = render(<QRCode value={LONG_VALUE} />)

      expect(container.querySelector('[data-slot=qr-code-mark]')).toBeNull()
      expect(container.querySelector('svg')).not.toHaveAttribute('data-branded')
    })

    it('warns once per value in development', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const value = `${LONG_VALUE}-warn`
      render(<QRCode value={value} />)
      render(<QRCode value={value} />)

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain('alignment pattern')
    })

    it('keeps the tile for versions without a centre alignment pattern', () => {
      const matrix = getQRMatrix('https://example.com/some/moderately/long')
      expect(matrix.version).toBeGreaterThan(1)
      expect(getTile(matrix).tile).not.toBeNull()
    })
  })

  it('exports QRCode from the root barrel', () => {
    expect(barrel.QRCode).toBe(QRCode)
    expectTypeOf<BarrelQRCodeProps>().toEqualTypeOf<QRCodeProps>()
  })
})
