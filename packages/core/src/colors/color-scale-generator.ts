import Color from 'colorjs.io'

import { getContrastColor } from './contrast'

// --- Types ---

export interface ScaleResult {
  /** 14 hex colors (steps 0-13) */
  light: string[]
  /** 14 hex colors (steps 0-13) */
  dark: string[]
  /** Recommended foreground color on step 9 (strong surface) */
  fgOnStrong: 'white' | 'black'
}

export interface NeutralScaleResult {
  /** 14 hex colors (steps 0-13) for light mode */
  light: string[]
  /** 14 hex colors (steps 0-13) for dark mode */
  dark: string[]
}

// --- OKLCH utilities ---

/** Extract the OKLCH hue (in degrees) from a hex color */
export function getOklchHue(hex: string): number {
  const color = new Color(hex).to('oklch')
  return Number(color.coords[2]) || 0
}

/** Extract the OKLCH chroma from a hex color */
export function getOklchChroma(hex: string): number {
  const color = new Color(hex).to('oklch')
  return Number(color.coords[1]) || 0
}

// --- Curves ---
// Each entry is [lightness, chroma_ratio] where chroma = ratio * peakChroma.
// These match the CSS oklch() declarations in tokens.css.

/** Light mode accent curve — L + chroma ratio (relative to peak at step 9) */
const ACCENT_LIGHT_CURVE: [number, number][] = [
  [1, 0],
  [0.984, 0.018],
  [0.971, 0.054],
  [0.949, 0.119],
  [0.925, 0.208],
  [0.891, 0.292],
  [0.849, 0.375],
  [0.794, 0.482],
  [0.718, 0.661],
  [0.639, 1],
  [0.598, 0.952],
  [0.547, 0.946],
  [0.324, 0.488],
  [0.2, 0.327]
]

/** Dark mode accent curve */
const ACCENT_DARK_CURVE: [number, number][] = [
  [0.08, 0],
  [0.178, 0.137],
  [0.212, 0.149],
  [0.273, 0.351],
  [0.317, 0.512],
  [0.365, 0.566],
  [0.415, 0.589],
  [0.475, 0.631],
  [0.543, 0.732],
  [0.639, 1],
  [0.601, 0.982],
  [0.771, 0.726],
  [0.906, 0.286],
  [0.96, 0.119]
]

/** Light mode neutral curve — L + fixed chroma (not ratio-based) */
const NEUTRAL_LIGHT_CURVE: [number, number][] = [
  [1, 0],
  [0.991, 0.004],
  [0.982, 0.007],
  [0.955, 0.011],
  [0.931, 0.014],
  [0.909, 0.019],
  [0.888, 0.022],
  [0.853, 0.028],
  [0.794, 0.038],
  [0.645, 0.039],
  [0.609, 0.037],
  [0.503, 0.032],
  [0.24, 0.024],
  [0.182, 0.015]
]

/** Dark mode neutral curve */
const NEUTRAL_DARK_CURVE: [number, number][] = [
  [0.13, 0.011],
  [0.178, 0.011],
  [0.214, 0.01],
  [0.252, 0.016],
  [0.284, 0.018],
  [0.312, 0.022],
  [0.347, 0.025],
  [0.398, 0.031],
  [0.489, 0.041],
  [0.538, 0.04],
  [0.582, 0.038],
  [0.769, 0.028],
  [0.949, 0.007],
  [0.991, 0.004]
]

// --- Helpers ---

/** Convert a Color to a full 6-digit hex string */
function toHex6(color: Color): string {
  const hex = color.to('srgb').toString({ format: 'hex' })
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

function curveToHex(
  curve: [number, number][],
  hue: number,
  chroma: number
): string[] {
  return curve.map(([L, ratio]) =>
    toHex6(new Color('oklch', [L, ratio * chroma, ratio === 0 ? 0 : hue]))
  )
}

// --- Public API ---

/**
 * Generate a 14-step accent color scale from a hex input.
 * Uses OKLCH curve-based generation (same model as the CSS tokens).
 */
export function generateAccentScale(accentHex: string): ScaleResult {
  const color = new Color(accentHex).to('oklch')
  const hue = Number(color.coords[2]) || 0
  const chroma = Math.max(Number(color.coords[1]) || 0, 0.1)

  const light = curveToHex(ACCENT_LIGHT_CURVE, hue, chroma)
  const dark = curveToHex(ACCENT_DARK_CURVE, hue, chroma)

  const fgOnStrong = getContrastColor(light[9] ?? '#000000')

  return { light, dark, fgOnStrong }
}

/**
 * Generate a 14-step neutral scale tinted with the accent color's hue.
 * Fixed chroma curve with the accent's hue for visual cohesion.
 */
export function generateNeutralScale(accentHex: string): NeutralScaleResult {
  const color = new Color(accentHex).to('oklch')
  const hue = Number(color.coords[2]) || 0

  const light = NEUTRAL_LIGHT_CURVE.map(([L, C]) =>
    toHex6(new Color('oklch', [L, C, C === 0 ? 0 : hue]))
  )
  const dark = NEUTRAL_DARK_CURVE.map(([L, C]) =>
    toHex6(new Color('oklch', [L, C, C === 0 ? 0 : hue]))
  )

  return { light, dark }
}
