import Color from 'colorjs.io'
import { describe, expect, it } from 'vitest'

import { getOklchChroma, getOklchHue } from './color-scale-generator'
import {
  accentFromPixels,
  getAccentChromaSync,
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

describe('getAccentChromaSync', () => {
  it.each([...PALETTE, '#b800f8'])(
    'keeps %s inside sRGB as the CSS writes it',
    (hex) => {
      const hue = Math.round(getOklchHueSync(hex))
      const chroma = +getAccentChromaSync(hex).toFixed(4)
      expect(
        new Color('oklch', [0.639, chroma, hue]).inGamut('srgb', {
          epsilon: 0.0005
        })
      ).toBe(true)
    }
  )

  it('gives Oztix blue the default accent chroma', () => {
    expect(getAccentChromaSync('#0091EB')).toBe(0.168)
  })

  it('caps a saturated green to what sRGB shows at the strong step', () => {
    expect(getAccentChromaSync('#00FF00')).toBeLessThan(
      getOklchChromaSync('#00FF00')
    )
  })
})

type Rgba = [number, number, number, number]

function rgba(hex: string, alpha = 255): Rgba {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha]
}

/** A width by height image whose bytes are read lazily, from `colour(x, y)`. */
function lazyImage(
  width: number,
  height: number,
  colour: (x: number, y: number) => Rgba
): ArrayLike<number> {
  return new Proxy({ length: width * height * 4 } as ArrayLike<number>, {
    get(target, key) {
      if (key === 'length') return target.length
      const pixel = Math.floor(Number(key) / 4)
      return colour(pixel % width, Math.floor(pixel / width))[Number(key) % 4]
    }
  })
}

/** An image as RGBA bytes: each entry is a colour and how many pixels of it. */
function image(...parts: [Rgba, number][]): Uint8ClampedArray {
  const bytes: number[] = []
  for (const [pixel, count] of parts)
    for (let i = 0; i < count; i++) bytes.push(...pixel)
  return new Uint8ClampedArray(bytes)
}

describe('accentFromPixels', () => {
  it.each([
    ['#e11d48'],
    ['#2563eb'],
    ['#16a34a'],
    ['#f59e0b'],
    ['#7c3aed'],
    ['#0091eb'],
    ['#ffff00']
  ])('returns a solid %s as itself', (hex) => {
    expect(accentFromPixels(image([rgba(hex), 64]))).toBe(hex)
  })

  it('picks a small vivid area over a large grey one', () => {
    expect(
      accentFromPixels(image([rgba('#7f7f7f'), 900], [rgba('#e11d48'), 100]))
    ).toBe('#e11d48')
  })

  it('picks a small vivid area over a large muted one', () => {
    expect(
      accentFromPixels(image([rgba('#4f7a5a'), 800], [rgba('#2563eb'), 200]))
    ).toBe('#2563eb')
  })

  it('counts a hue split across two close shades as one', () => {
    // Blues at hue 258 and 263, together heavier than the red, each lighter.
    const accent = accentFromPixels(
      image(
        [rgba('#0060d0'), 300],
        [rgba('#2563eb'), 300],
        [rgba('#e11d48'), 400]
      )
    )
    expect(getOklchHueSync(accent!)).toBeGreaterThan(255)
    expect(getOklchHueSync(accent!)).toBeLessThan(265)
  })

  it('takes the colour of the most vivid hue, not a blend across hues', () => {
    const accent = accentFromPixels(
      image([rgba('#e11d48'), 600], [rgba('#2563eb'), 400])
    )
    expect(accent).toBe('#e11d48')
  })

  it('averages close shades of one hue', () => {
    const accent = accentFromPixels(
      image([rgba('#2563eb'), 500], [rgba('#1d4ed8'), 500])
    )
    expect(accent).not.toBeNull()
    expect(accent).not.toBe('#2563eb')
    expect(accent).not.toBe('#1d4ed8')
  })

  it.each([
    ['grey', image([rgba('#808080'), 64], [rgba('#a3a3a3'), 64])],
    ['near white', image([rgba('#fbfaf7'), 64])],
    ['a pale tint of near white', image([rgba('#ffffc0'), 64])],
    ['near black', image([rgba('#0d0b10'), 64])],
    ['a dark tint of near black', image([rgba('#1a0005'), 64])],
    ['transparent', image([rgba('#e11d48', 0), 64])],
    ['a speck of colour', image([rgba('#808080'), 999], [rgba('#e11d48'), 1])],
    ['empty', new Uint8ClampedArray()]
  ])('returns null for %s', (_, pixels) => {
    expect(accentFromPixels(pixels)).toBeNull()
  })

  it('ignores pixels that are mostly transparent', () => {
    expect(
      accentFromPixels(
        image([rgba('#e11d48', 20), 900], [rgba('#2563eb'), 100])
      )
    ).toBe('#2563eb')
  })

  it('reads RGB bytes with channels: 3 the same as RGBA', () => {
    const four = image([rgba('#8a9a7b'), 500], [rgba('#16a34a'), 300])
    const three = four.filter((_, index) => index % 4 !== 3)
    expect(accentFromPixels(three, { channels: 3 })).toBe(
      accentFromPixels(four)
    )
  })

  it('takes a plain array', () => {
    expect(accentFromPixels([225, 29, 72, 255])).toBe('#e11d48')
  })

  it('samples a large image without reading every pixel', () => {
    const size = 4000 * 4000
    let reads = 0
    // A 4000 by 4000 orange image, counting the bytes read.
    const pixels = new Proxy({ length: size * 4 } as ArrayLike<number>, {
      get(target, key) {
        if (key === 'length') return target.length
        reads++
        return [245, 158, 11, 255][Number(key) % 4]
      }
    })
    expect(accentFromPixels(pixels)).toBe('#f59e0b')
    expect(reads).toBeLessThan(100_000)
  })

  it.each([
    [4096, 4096],
    [1125, 4096]
  ])(
    'finds the colour inside the border of a %i by %i image',
    (width, height) => {
      // Red inside an 8px white border.
      const pixels = lazyImage(width, height, (x, y) =>
        x < 8 || y < 8 || x >= width - 8 || y >= height - 8
          ? rgba('#ffffff')
          : rgba('#e11d48')
      )
      expect(accentFromPixels(pixels)).toBe('#e11d48')
    }
  )
})
