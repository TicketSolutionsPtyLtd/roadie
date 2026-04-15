/**
 * Synchronous sRGB → OKLCH conversion.
 *
 * Roadie's main colour pipeline (`color-scale-generator.ts`) depends on
 * `colorjs.io` and is therefore async. This module provides a tiny,
 * dependency-free sync converter for the one hot path that actually
 * matters: turning a user-supplied accent hex into the two numbers
 * (`--accent-hue` and `--accent-chroma`) that Roadie's CSS-native
 * OKLCH curves need for pre-hydration bootstrap.
 *
 * The conversion follows Björn Ottosson's reference implementation
 * (https://bottosson.github.io/posts/oklab/). For valid sRGB inputs,
 * its output matches `colorjs.io` to 4 decimal places — verified by
 * parity tests in `srgb-to-oklch.test.ts`.
 *
 * This file is intentionally zero-dependency and synchronous. Do not
 * add colorjs.io here — the whole point is to skip the async import.
 */

export interface Oklch {
  /** Lightness, 0..1 */
  l: number
  /** Chroma, typically 0..0.4 */
  c: number
  /** Hue, degrees (0..360) */
  h: number
}

/** Parse a 3, 6, or 8 digit hex string into linear 0..1 rgb channels. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace(/^#/, '').toLowerCase()
  let r: number
  let g: number
  let b: number
  if (normalized.length === 3) {
    r = parseInt(normalized[0]! + normalized[0]!, 16)
    g = parseInt(normalized[1]! + normalized[1]!, 16)
    b = parseInt(normalized[2]! + normalized[2]!, 16)
  } else if (normalized.length === 6 || normalized.length === 8) {
    r = parseInt(normalized.slice(0, 2), 16)
    g = parseInt(normalized.slice(2, 4), 16)
    b = parseInt(normalized.slice(4, 6), 16)
  } else {
    throw new Error(`Invalid hex colour: ${hex}`)
  }
  return { r: r / 255, g: g / 255, b: b / 255 }
}

/** sRGB gamma decode — matches the IEC 61966-2-1 spec with the 0.04045 kink. */
function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4)
}

/**
 * Convert a hex colour to Oklab → OKLCH using Ottosson's matrices.
 *
 * The conversion is: hex → sRGB → linear RGB → LMS → cube root → Oklab
 * → OKLCH. Cube roots are real-valued for the positive LMS range.
 */
export function hexToOklch(hex: string): Oklch {
  const { r, g, b } = hexToRgb(hex)
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  // Linear sRGB → LMS (Ottosson's M1 matrix)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const lCube = Math.cbrt(l)
  const mCube = Math.cbrt(m)
  const sCube = Math.cbrt(s)

  // LMS (non-linear) → Oklab (Ottosson's M2 matrix)
  const L = 0.2104542553 * lCube + 0.793617785 * mCube - 0.0040720468 * sCube
  const a = 1.9779984951 * lCube - 2.428592205 * mCube + 0.4505937099 * sCube
  const bOklab =
    0.0259040371 * lCube + 0.7827717662 * mCube - 0.808675766 * sCube

  // Oklab → OKLCH
  const C = Math.hypot(a, bOklab)
  // atan2 returns radians in [-pi, pi]; convert to [0, 360)
  let H = (Math.atan2(bOklab, a) * 180) / Math.PI
  if (H < 0) H += 360

  return { l: L, c: C, h: H }
}

/** Synchronous counterpart to `getOklchHue`. */
export function getOklchHueSync(hex: string): number {
  return hexToOklch(hex).h
}

/** Synchronous counterpart to `getOklchChroma`. */
export function getOklchChromaSync(hex: string): number {
  return hexToOklch(hex).c
}
