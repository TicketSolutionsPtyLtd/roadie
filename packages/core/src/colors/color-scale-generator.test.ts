import Color from 'colorjs.io'
import { describe, expect, it } from 'vitest'

import {
  generateAccentScale,
  generateNeutralScale,
  getOklchChroma,
  getOklchHue
} from './color-scale-generator'

const HEX_REGEX = /^#[0-9a-f]{6}$/i

function getOklch(hex: string) {
  const c = new Color(hex).to('oklch')
  return {
    L: Number(c.coords[0]) || 0,
    C: Number(c.coords[1]) || 0,
    H: Number(c.coords[2]) || 0
  }
}

describe('generateAccentScale', () => {
  const oztixBlue = '#0091EB'

  it('returns 14 light colors (steps 0-13)', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(result.light).toHaveLength(14)
  })

  it('returns 14 dark colors (steps 0-13)', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(result.dark).toHaveLength(14)
  })

  it('returns valid hex strings', async () => {
    const result = await generateAccentScale(oztixBlue)
    for (const hex of result.light) {
      expect(hex).toMatch(HEX_REGEX)
    }
    for (const hex of result.dark) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })

  it('step 0 is white in light mode', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(result.light[0]).toBe('#ffffff')
  })

  it('step 0 is near-black in dark mode', async () => {
    const result = await generateAccentScale(oztixBlue)
    const { L } = getOklch(result.dark[0]!)
    expect(L).toBeLessThan(0.2)
  })

  it('step 13 is near-black in light mode', async () => {
    const result = await generateAccentScale(oztixBlue)
    const { L } = getOklch(result.light[13]!)
    expect(L).toBeLessThan(0.3)
  })

  it('step 13 is near-white in dark mode', async () => {
    const result = await generateAccentScale(oztixBlue)
    const { L } = getOklch(result.dark[13]!)
    expect(L).toBeGreaterThan(0.85)
  })

  it('fgOnStrong is white or black', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(['white', 'black']).toContain(result.fgOnStrong)
  })

  it('fgOnStrong is black for Oztix Blue (bright accent)', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(result.fgOnStrong).toBe('black')
  })

  it('different inputs produce different scales', async () => {
    const red = await generateAccentScale('#FF0000')
    const green = await generateAccentScale('#00AA00')
    expect(red.light[9]).not.toBe(green.light[9])
  })

  it('step 9 hue is close to the input accent hue', async () => {
    const result = await generateAccentScale(oztixBlue)
    const inputHue = getOklch(oztixBlue).H
    const step9Hue = getOklch(result.light[9]!).H
    expect(Math.abs(step9Hue - inputHue)).toBeLessThan(10)
  })

  it('light scale lightness decreases from step 0 to step 13', async () => {
    const result = await generateAccentScale(oztixBlue)
    const firstL = getOklch(result.light[0]!).L
    const lastL = getOklch(result.light[13]!).L
    expect(firstL).toBeGreaterThan(lastL)
  })

  it('dark scale lightness increases from step 0 to step 13', async () => {
    const result = await generateAccentScale(oztixBlue)
    const firstL = getOklch(result.dark[0]!).L
    const lastL = getOklch(result.dark[13]!).L
    expect(firstL).toBeLessThan(lastL)
  })
})

describe('generateNeutralScale', () => {
  const oztixBlue = '#0091EB'

  it('returns 14 light colors', async () => {
    const result = await generateNeutralScale(oztixBlue)
    expect(result.light).toHaveLength(14)
  })

  it('returns 14 dark colors', async () => {
    const result = await generateNeutralScale(oztixBlue)
    expect(result.dark).toHaveLength(14)
  })

  it('returns valid hex strings', async () => {
    const result = await generateNeutralScale(oztixBlue)
    for (const hex of result.light) {
      expect(hex).toMatch(HEX_REGEX)
    }
    for (const hex of result.dark) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })

  it('neutral scale has low chroma (subtle tinting)', async () => {
    const result = await generateNeutralScale(oztixBlue)
    for (const hex of result.light) {
      const { C } = getOklch(hex)
      expect(C).toBeLessThan(0.05)
    }
    for (const hex of result.dark) {
      const { C } = getOklch(hex)
      expect(C).toBeLessThan(0.05)
    }
  })

  it('non-zero chroma steps carry the accent hue', async () => {
    const result = await generateNeutralScale(oztixBlue)
    const accentHue = getOklch(oztixBlue).H
    const step7Hue = getOklch(result.light[7]!).H
    expect(Math.abs(step7Hue - accentHue)).toBeLessThan(10)
  })

  it('different accent colors produce differently-tinted neutrals', async () => {
    const blueNeutral = await generateNeutralScale('#0091EB')
    const redNeutral = await generateNeutralScale('#FF0000')
    expect(blueNeutral.light[7]).not.toBe(redNeutral.light[7])
  })

  it('lightness decreases in light, increases in dark', async () => {
    const result = await generateNeutralScale(oztixBlue)
    expect(getOklch(result.light[0]!).L).toBeGreaterThan(
      getOklch(result.light[13]!).L
    )
    expect(getOklch(result.dark[0]!).L).toBeLessThan(
      getOklch(result.dark[13]!).L
    )
  })
})

describe('getOklchHue', () => {
  it('extracts hue from Oztix Blue', async () => {
    const hue = await getOklchHue('#0091EB')
    expect(hue).toBeGreaterThan(240)
    expect(hue).toBeLessThan(260)
  })

  it('extracts hue from red', async () => {
    const hue = await getOklchHue('#FF0000')
    expect(hue).toBeGreaterThan(20)
    expect(hue).toBeLessThan(35)
  })

  it('returns 0 for achromatic colors', async () => {
    expect(await getOklchHue('#000000')).toBe(0)
    expect(await getOklchHue('#808080')).toBe(0)
  })
})

describe('getOklchChroma', () => {
  it('extracts chroma from Oztix Blue', async () => {
    const chroma = await getOklchChroma('#0091EB')
    expect(chroma).toBeGreaterThan(0.15)
    expect(chroma).toBeLessThan(0.2)
  })

  it('returns 0 for achromatic colors', async () => {
    expect(await getOklchChroma('#000000')).toBe(0)
    expect(await getOklchChroma('#808080')).toBeCloseTo(0, 3)
  })
})
