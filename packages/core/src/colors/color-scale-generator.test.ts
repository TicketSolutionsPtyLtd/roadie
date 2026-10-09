import Color from 'colorjs.io'
import { describe, expect, it } from 'vitest'

import {
  generateAccentScale,
  generateNeutralScale,
  getOklchChroma,
  getOklchHue
} from './color-scale-generator'
import { getAccentChromaSync, getOklchHueSync } from './srgb-to-oklch'

const HEX_REGEX = /^#[0-9a-f]{6}$/i

// APCA-W3 0.0.98G Lc for white text, constants from Myndex/apca-w3 (SA98G).
function whiteTextLc(backgroundHex: string) {
  const [r, g, b] = new Color(backgroundHex).to('srgb').coords.map(Number)
  let y = 0.2126729 * r! ** 2.4 + 0.7151522 * g! ** 2.4 + 0.072175 * b! ** 2.4
  if (y < 0.022) y += (0.022 - y) ** 1.414
  return -((y ** 0.65 - 1) * 1.14 + 0.027) * 100
}

// The hex fallbacks in tokens.css when INNO-1230 landed. fgOnStrong was
// recorded from the colorjs.io APCA path it replaced.
// prettier-ignore
const SHIPPED_SCALES = {
  light: {
    neutral: [
      '#ffffff', '#fafcff', '#f5fafe', '#eaf1f7', '#e1e9f1', '#d7e2ed', '#cfdce8',
      '#c1d1e1', '#a9bfd3', '#7b90a5', '#718598', '#475766', '#16202a', '#0d1318'
    ],
    brand: [
      '#ffffff', '#f8fafc', '#f1f6fb', '#e4f0fb', '#d4e9fd', '#c2dffb', '#add2f5',
      '#92c1ee', '#68aae6', '#0191eb', '#0084d9', '#01538a', '#04365b', '#00172d'
    ],
    'brand-secondary': [
      '#ffffff', '#fcf9f8', '#fef2ee', '#ffe6db', '#ffd3bd', '#ffc3a8', '#ffb290',
      '#ff9e78', '#f78255', '#ff8a5c', '#f37f51', '#953601', '#5f270f', '#2b0a00'
    ],
    accent: [
      '#ffffff', '#f8fafc', '#f1f6fb', '#e4f0fb', '#d4e9fd', '#c2dffb', '#add2f5',
      '#92c1ee', '#68aae6', '#0191eb', '#0084d9', '#01538a', '#04365b', '#00172d'
    ],
    danger: [
      '#ffffff', '#fbf9f8', '#fdf2f1', '#ffe6e2', '#ffd2c9', '#ffc2b7', '#ffb4a9',
      '#f5a296', '#ea897c', '#ff6b5c', '#f25f51', '#a00207', '#592b25', '#2c120e'
    ],
    success: [
      '#ffffff', '#f5fbfa', '#edf9f7', '#d4f6f1', '#bbf2ea', '#a1eae0', '#86ded3',
      '#61cec1', '#01baab', '#00c2b3', '#00b6a8', '#006057', '#02453f', '#00201d'
    ],
    warning: [
      '#ffffff', '#fefdf9', '#fffae6', '#fff4ba', '#ffeb9e', '#ffe077', '#ffd04f',
      '#f0c250', '#deaa00', '#e0ac00', '#d5a101', '#735302', '#483a1a', '#221906'
    ],
    info: [
      '#ffffff', '#faf9fc', '#f7f4fc', '#f1e9fd', '#eadefd', '#e1d1fb', '#d6c1f7',
      '#c8acf0', '#b691e8', '#a96af1', '#9d5de3', '#6d2fa9', '#431e69', '#1e0833'
    ]
  },
  dark: {
    neutral: [
      '#05080b', '#0d1216', '#161a1e', '#1c232a', '#232b32', '#28323c', '#2f3b46',
      '#3a4957', '#4d6377', '#5c7185', '#697d91', '#c6d6e6', '#eaeff3', '#fafcff'
    ],
    brand: [
      '#020202', '#09121b', '#0f1a24', '#0a2942', '#00345b', '#01416d', '#114f7e',
      '#1f6094', '#2674b3', '#0191eb', '#0084dd', '#b2daff', '#e2f1ff', '#fbfdff'
    ],
    'brand-secondary': [
      '#020202', '#15100d', '#1e1512', '#361a10', '#4a1b07', '#59230c', '#693019',
      '#814027', '#a65332', '#ff8a5c', '#f37f51', '#ffccb8', '#ffe9e1', '#fffbf9'
    ],
    accent: [
      '#020202', '#09121b', '#0f1a24', '#0a2942', '#00345b', '#01416d', '#114f7e',
      '#1f6094', '#2674b3', '#0191eb', '#0084dd', '#b2daff', '#e2f1ff', '#fbfdff'
    ],
    danger: [
      '#020202', '#160f0e', '#1f1412', '#3a1410', '#50110d', '#611913', '#71261f',
      '#8a362e', '#b3473d', '#ff6b5c', '#f25f51', '#ffcac1', '#fee9e6', '#fefbfa'
    ],
    success: [
      '#020202', '#0b1312', '#101c1a', '#0b2d2a', '#003b36', '#024842', '#0e5750',
      '#146a61', '#127f75', '#00c2b3', '#00b6a8', '#55eddc', '#b8fff4', '#fbfffe'
    ],
    warning: [
      '#020202', '#13110b', '#1c180f', '#2c2208', '#3c2900', '#493300', '#564106',
      '#69531a', '#856923', '#fcc101', '#f1b700', '#ffd35b', '#fee7b5', '#fef4df'
    ],
    info: [
      '#020202', '#130e1a', '#1c1426', '#2c1b40', '#392156', '#442864', '#503373',
      '#63428b', '#8155b5', '#a96af1', '#9d5de3', '#e4ccff', '#f2eafe', '#fcfbff'
    ]
  }
}

const SHIPPED_STEPS = Object.entries(SHIPPED_SCALES).flatMap(([mode, scales]) =>
  Object.entries(scales).flatMap(([scale, hexes]) =>
    hexes.map((hex, step) => [mode, scale, step, hex] as const)
  )
)

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

  describe.each(['#00FF00', '#00FFFF', '#FFFF00', '#FF00FF'])(
    'a saturated accent of %s',
    (hex) => {
      it('matches the capped strong fill the CSS draws', async () => {
        const { light } = await generateAccentScale(hex)
        const css = new Color('oklch', [
          0.639,
          getAccentChromaSync(hex),
          getOklchHueSync(hex)
        ])
        expect(new Color(light[9]!).deltaE(css, '2000')).toBeLessThan(0.5)
      })

      it('keeps white text at Lc 60 on the strong fill', async () => {
        const { light, dark } = await generateAccentScale(hex)
        expect(whiteTextLc(light[9]!)).toBeGreaterThanOrEqual(60)
        expect(whiteTextLc(dark[9]!)).toBeGreaterThanOrEqual(60)
      })
    }
  )

  it('fgOnStrong is white or black', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(['white', 'black']).toContain(result.fgOnStrong)
  })

  it('fgOnStrong is white for Oztix Blue, matching text-on-strong', async () => {
    const result = await generateAccentScale(oztixBlue)
    expect(result.fgOnStrong).toBe('white')
  })

  it.each(SHIPPED_STEPS)(
    'puts white text on the strong fill generated from %s %s step %i',
    async (_mode, _scale, _step, hex) => {
      const result = await generateAccentScale(hex)
      expect(result.fgOnStrong).toBe('white')
    }
  )

  it('keeps a grey accent grey in the fallback scale', async () => {
    const { light } = await generateAccentScale('#808080')
    expect(getOklch(light[9]!).C).toBeLessThan(0.01)
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
