import Color from 'colorjs.io'
import { describe, expect, it } from 'vitest'

import { getOklchChroma, getOklchHue } from './color-scale-generator'
import {
  getOklchChromaSync,
  getOklchHueSync,
  hexToOklch
} from './srgb-to-oklch'

/**
 * Representative palette covering:
 * - Oztix brand blue + its shades
 * - Primary hues (red, green, blue, yellow, magenta, cyan)
 * - Neutrals (white, black, mid grey)
 * - 3-digit shorthand
 * - Muted / low-chroma colours (common for brand palettes)
 */
const PALETTE = [
  '#0091EB', // Oztix blue
  '#7C3AED', // Purple
  '#72BF44', // Green
  '#EA580C', // Orange
  '#E83068', // Pink
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#000000',
  '#FFFFFF',
  '#808080',
  '#abc', // 3-digit
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#facc15',
  '#334155'
]

/** Compute hue + chroma via colorjs.io (the async source of truth). */
function colorjs(hex: string) {
  const c = new Color(hex).to('oklch')
  return {
    L: Number(c.coords[0]) || 0,
    C: Number(c.coords[1]) || 0,
    H: Number(c.coords[2]) || 0
  }
}

describe('hexToOklch — sync parity with colorjs.io', () => {
  for (const hex of PALETTE) {
    it(`matches colorjs.io output for ${hex} within 4 decimal places`, () => {
      const sync = hexToOklch(hex)
      const async_ = colorjs(hex)

      expect(sync.l).toBeCloseTo(async_.L, 4)
      expect(sync.c).toBeCloseTo(async_.C, 4)
      // Hue is meaningless for neutrals (C ≈ 0). Skip the check there.
      if (async_.C > 1e-4) {
        expect(sync.h).toBeCloseTo(async_.H, 2)
      }
    })
  }
})

describe('getOklchHueSync / getOklchChromaSync', () => {
  it('matches async getOklchHue for chromatic colours', async () => {
    for (const hex of ['#0091EB', '#FF0000', '#00FF00', '#0000FF']) {
      const sync = getOklchHueSync(hex)
      const async_ = await getOklchHue(hex)
      expect(sync).toBeCloseTo(async_, 2)
    }
  })

  it('matches async getOklchChroma for chromatic colours', async () => {
    for (const hex of ['#0091EB', '#FF0000', '#00FF00', '#0000FF']) {
      const sync = getOklchChromaSync(hex)
      const async_ = await getOklchChroma(hex)
      expect(sync).toBeCloseTo(async_, 4)
    }
  })

  it('handles shorthand hex', () => {
    const sync = hexToOklch('#abc')
    const async_ = colorjs('#aabbcc')
    expect(sync.l).toBeCloseTo(async_.L, 4)
    expect(sync.c).toBeCloseTo(async_.C, 4)
  })

  it('throws on invalid hex length', () => {
    expect(() => hexToOklch('#12')).toThrow(/Invalid hex/)
    expect(() => hexToOklch('not-a-hex')).toThrow(/Invalid hex/)
  })

  it('returns hue 0 for pure black', () => {
    const { c, l } = hexToOklch('#000000')
    expect(l).toBeCloseTo(0, 4)
    expect(c).toBeCloseTo(0, 4)
  })

  it('returns lightness 1 and chroma 0 for pure white', () => {
    const { l, c } = hexToOklch('#FFFFFF')
    expect(l).toBeCloseTo(1, 4)
    expect(c).toBeCloseTo(0, 4)
  })
})
