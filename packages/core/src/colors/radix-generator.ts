import * as RadixColors from '@radix-ui/colors'
import Color from 'colorjs.io'

// Types
type ArrayOf12<T> = [T, T, T, T, T, T, T, T, T, T, T, T]
const arrayOf12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export interface ScaleResult {
  /** 14 hex colors (steps 0-13) */
  light: string[]
  /** 14 hex colors (steps 0-13) */
  dark: string[]
  /** Recommended foreground color on step 9 (strong surface) */
  fgOnStrong: 'white' | 'black'
}

// Constants
const grayScaleNames = [
  'gray',
  'mauve',
  'slate',
  'sage',
  'olive',
  'sand',
] as const
const scaleNames = [
  ...grayScaleNames,
  'tomato',
  'red',
  'ruby',
  'crimson',
  'pink',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'brown',
  'orange',
  'sky',
  'mint',
  'lime',
  'yellow',
  'amber',
] as const

// DATA PROCESSING
const lightColors = Object.fromEntries(
  scaleNames.map((scaleName) => [
    scaleName,
    Object.values(
      RadixColors[`${scaleName}P3` as keyof typeof RadixColors] as Record<
        string,
        string
      >
    ).map((str) => new Color(str).to('oklch')),
  ])
) as Record<string, ArrayOf12<Color>>

const darkColors = Object.fromEntries(
  scaleNames.map((scaleName) => [
    scaleName,
    Object.values(
      RadixColors[
        `${scaleName}DarkP3` as keyof typeof RadixColors
      ] as Record<string, string>
    ).map((str) => new Color(str).to('oklch')),
  ])
) as Record<string, ArrayOf12<Color>>

/**
 * Generate a full 0-13 Radix-style OKLCH color scale from a hex input.
 * Steps 1-12 follow Radix geometric interpolation.
 * Step 0 = lightest extreme, Step 13 = darkest extreme.
 */
export function generateRadixScale(accentHex: string): ScaleResult {
  const accentBaseColor = new Color(accentHex).to('oklch')

  const lightScale = generateScale(accentBaseColor, lightColors)
  const darkScale = generateScale(accentBaseColor, darkColors)

  // Extend to 0-13
  const lightFull = extendScale(lightScale, 'light')
  const darkFull = extendScale(darkScale, 'dark')

  // Determine fg-on-strong contrast
  const step9Hex = lightFull[9] ?? '#000000'
  const fgOnStrong = getContrastForeground(step9Hex)

  return {
    light: lightFull,
    dark: darkFull,
    fgOnStrong,
  }
}

/**
 * Extend a 12-step scale to 14 steps (0-13).
 * Step 0: lightest extreme (white in light, near-black in dark)
 * Step 13: darkest extreme (near-black in light, near-white in dark)
 */
function extendScale(scale12: string[], mode: 'light' | 'dark'): string[] {
  const step12Hex = scale12[11] ?? scale12[scale12.length - 1] ?? '#000000'

  if (mode === 'light') {
    const step0 = '#ffffff'
    const step12Color = new Color(step12Hex).to('oklch')
    const [L, C, H] = getCoords(step12Color)
    const step13Color = new Color('oklch', [
      Math.max(0.1, L - 0.12),
      C,
      H,
    ])
    const step13 = step13Color.to('srgb').toString({ format: 'hex' })
    return [step0, ...scale12, step13]
  } else {
    const step0 = '#0d0d0d'
    const step12Color = new Color(step12Hex).to('oklch')
    const [L, C, H] = getCoords(step12Color)
    const step13Color = new Color('oklch', [
      Math.min(0.98, L + 0.05),
      Math.max(0, C - 0.01),
      H,
    ])
    const step13 = step13Color.to('srgb').toString({ format: 'hex' })
    return [step0, ...scale12, step13]
  }
}

/** Safely extract OKLCH coords as [L, C, H] numbers */
function getCoords(color: Color): [number, number, number] {
  const c = color.coords
  return [Number(c[0]) || 0, Number(c[1]) || 0, Number(c[2]) || 0]
}

function getContrastForeground(bgHex: string): 'white' | 'black' {
  const bg = new Color(bgHex).to('srgb')
  const [r, g, b] = getCoords(bg)

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  const contrastWithWhite = (1 + 0.05) / (luminance + 0.05)
  const contrastWithBlack = (luminance + 0.05) / (0 + 0.05)

  return contrastWithWhite >= contrastWithBlack ? 'white' : 'black'
}

// --- INTERNAL: Scale generation (ported from Radix) ---

function generateScale(
  accentBaseColor: Color,
  scales: Record<string, ArrayOf12<Color>>
): string[] {
  const scale = getScaleFromColor(accentBaseColor, scales)

  // Apply corrections (step 9 match)
  const [accent9Color] = getStep9Colors(scale, accentBaseColor)
  scale[8] = accent9Color
  scale[9] = getButtonHoverColor(accent9Color)

  // Format output (12 steps as hex)
  return scale.map((c) => c.to('srgb').toString({ format: 'hex' }))
}

function getScaleFromColor(
  source: Color,
  scales: Record<string, ArrayOf12<Color>>
) {
  const allColors: { scale: string; color: Color; distance: number }[] = []

  Object.entries(scales).forEach(([name, scale]) => {
    for (const color of scale) {
      const distance = source.deltaEOK(color)
      allColors.push({ scale: name, distance, color })
    }
  })

  allColors.sort((a, b) => a.distance - b.distance)

  const closestColors = allColors.filter(
    (color, i, arr) =>
      i === arr.findIndex((value) => value.scale === color.scale)
  )

  const colorA = closestColors[0]!
  const colorB = closestColors[1]!

  // Geometric Mix Logic (Triangle)
  const a = colorB.distance
  const b = colorA.distance
  const c = colorA.color.deltaEOK(colorB.color)

  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c)
  const radA = Math.acos(cosA)
  const sinA = Math.sin(radA)

  const cosB = (a ** 2 + c ** 2 - b ** 2) / (2 * a * c)
  const radB = Math.acos(cosB)
  const sinB = Math.sin(radB)

  const tanC1 = cosA / sinA
  const tanC2 = cosB / sinB

  const ratio = Math.max(0, tanC1 / tanC2) * 0.5

  const scaleA = scales[colorA.scale]!
  const scaleB = scales[colorB.scale]!

  // Mix the two closest scales
  const scale = arrayOf12.map(
    (i) => new Color(Color.mix(scaleA[i], scaleB[i], ratio)).to('oklch')
  ) as ArrayOf12<Color>

  // Pick Closest from Mixed
  const baseColor = scale
    .slice()
    .sort((a, b) => source.deltaEOK(a) - source.deltaEOK(b))[0]!

  // Chroma Correction
  const [, sourceC, sourceH] = getCoords(source)
  const [, baseC] = getCoords(baseColor)
  if (baseC === 0) return scale

  const ratioC = sourceC / baseC

  scale.forEach((color) => {
    const [, colorC] = getCoords(color)
    color.coords[1] = colorC * ratioC
    color.coords[2] = sourceH // Use source hue
  })

  return scale
}

function getStep9Colors(
  scale: ArrayOf12<Color>,
  accentBaseColor: Color
): [Color] {
  const referenceBackgroundColor = scale[0]
  const distance = accentBaseColor.deltaEOK(referenceBackgroundColor) * 100

  if (distance < 25) {
    return [scale[8]]
  }

  return [accentBaseColor]
}

function getButtonHoverColor(source: Color) {
  const [L, C, H] = getCoords(source)
  const newL = L > 0.4 ? L - 0.05 : L + 0.05
  return new Color('oklch', [newL, C, H])
}
