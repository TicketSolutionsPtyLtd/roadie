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
 * its output matches `colorjs.io` to 4 decimal places, verified by
 * parity tests in `srgb-to-oklch.test.ts`.
 *
 * `accentFromPixels` lives here too, for the same reason: it builds into
 * this shared chunk, not into `colors/index.js`, whose own body imports
 * colorjs.io for `getContrastColor`, so it costs an app about 1 kB instead
 * of 28 kB. The size budget for it catches a move that undoes this.
 *
 * This file is intentionally zero-dependency and synchronous. Do not
 * add colorjs.io here: the whole point is to skip the async import.
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

/** sRGB gamma decode: matches the IEC 61966-2-1 spec with the 0.04045 kink. */
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
  const { l: L, a, b: bOklab } = srgbToOklab(r, g, b)

  // Oklab → OKLCH
  const C = Math.hypot(a, bOklab)
  // atan2 returns radians in [-pi, pi]; convert to [0, 360)
  let H = (Math.atan2(bOklab, a) * 180) / Math.PI
  if (H < 0) H += 360

  return { l: L, c: C, h: H }
}

/** Gamma-encoded sRGB channels, 0..1, to Oklab. */
export function srgbToOklab(
  r: number,
  g: number,
  b: number
): { l: number; a: number; b: number } {
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

  return { l: L, a, b: bOklab }
}

/** Oklab to linear sRGB channels, which fall outside 0..1 out of gamut. */
export function oklabToLinearSrgb(
  l: number,
  a: number,
  b: number
): [number, number, number] {
  // Oklab → LMS (non-linear) → LMS, Ottosson's inverse matrices
  const lCube = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mCube = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sCube = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
    -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
    -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube
  ]
}

/** Synchronous counterpart to `getOklchHue`. */
export function getOklchHueSync(hex: string): number {
  return hexToOklch(hex).h
}

/** Synchronous counterpart to `getOklchChroma`. */
export function getOklchChromaSync(hex: string): number {
  return hexToOklch(hex).c
}

/** Lightness of the accent's strong step (step 9) in both modes. */
const ACCENT_STRONG_LIGHTNESS = 0.639

function inSrgbGamut(l: number, c: number, h: number): boolean {
  const radians = (h * Math.PI) / 180
  const channels = oklabToLinearSrgb(
    l,
    c * Math.cos(radians),
    c * Math.sin(radians)
  )
  return channels.every((channel) => channel >= 0 && channel <= 1)
}

/**
 * The accent chroma to set as `--accent-chroma`: the hex's own chroma, capped
 * to what sRGB can show at the strong step. Browsers clip an out-of-gamut
 * fill, which lightens it, so a saturated green or cyan accent would otherwise
 * render too light for its white text. The cap is taken at the whole-degree
 * hue and 4-decimal chroma that `--accent-hue` and `--accent-chroma` carry,
 * since the gamut edge moves with hue.
 */
export function getAccentChromaSync(hex: string): number {
  const { c, h } = hexToOklch(hex)
  const hue = Math.round(h)
  const serialized = Math.floor(c * 1e4) / 1e4
  if (inSrgbGamut(ACCENT_STRONG_LIGHTNESS, serialized, hue)) return serialized
  let low = 0
  let high = serialized
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2
    if (inSrgbGamut(ACCENT_STRONG_LIGHTNESS, mid, hue)) low = mid
    else high = mid
  }
  return Math.floor(low * 1e4) / 1e4
}

export type AccentFromPixelsOptions = {
  /** Bytes per pixel: 4 for RGBA, such as a canvas's `ImageData.data`, or 3 for RGB. @default 4 */
  channels?: 3 | 4
}

/** Enough to find the colour of a 64px copy, with every pixel read. */
const MAX_SAMPLES = 4096
/** 10° wide, so a hue lands beside its neighbours in a 30° window. */
const BUCKETS = 36
/** Below this, a pixel reads as grey. */
const MIN_CHROMA = 0.04
/** Near black and near white carry no hue worth taking. */
const MIN_LIGHTNESS = 0.2
const MAX_LIGHTNESS = 0.96
/** Colour on less than 1 in this many opaque pixels is a speck, not the image's. */
const SPECK = 100

/**
 * The accent colour of an image, from its raw pixels: a hex for
 * `ThemeProvider`'s `accentColor`, or `null` when the image has no usable
 * colour (grey, near white, near black, or transparent), which falls back to
 * the parent's accent.
 *
 * It finds the image's dominant hue in OKLCH, weighting each pixel by its
 * chroma squared, so a small vivid area beats a large muted one, and returns
 * the average colour of that hue. Pure and synchronous, so it runs wherever
 * pixels are: a server where the image is uploaded, a worker, or a canvas.
 * A large image is sampled, so pass a small copy where you can.
 *
 * @example
 * const { data } = context.getImageData(0, 0, 32, 32)
 * <ThemeProvider accentColor={accentFromPixels(data)}>
 */
export function accentFromPixels(
  pixels: ArrayLike<number>,
  { channels = 4 }: AccentFromPixelsOptions = {}
): string | null {
  const count = Math.floor(pixels.length / channels)
  const step = Math.max(1, Math.ceil(count / MAX_SAMPLES))
  // Per hue bucket: total weight, then weighted lightness, a, and b.
  const buckets = new Float64Array(BUCKETS * 4)
  let opaque = 0
  let coloured = 0

  for (let pixel = 0; pixel < count; pixel += step) {
    const index = pixel * channels
    if (channels === 4 && pixels[index + 3]! < 128) continue
    opaque++
    const { l, a, b } = srgbToOklab(
      pixels[index]! / 255,
      pixels[index + 1]! / 255,
      pixels[index + 2]! / 255
    )
    const chroma = Math.hypot(a, b)
    if (chroma < MIN_CHROMA || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue
    coloured++
    const hue = (Math.atan2(b, a) / (2 * Math.PI) + 1) % 1
    const slot = (Math.floor(hue * BUCKETS) % BUCKETS) * 4
    const weight = chroma * chroma
    buckets[slot] = buckets[slot]! + weight
    buckets[slot + 1] = buckets[slot + 1]! + weight * l
    buckets[slot + 2] = buckets[slot + 2]! + weight * a
    buckets[slot + 3] = buckets[slot + 3]! + weight * b
  }

  if (coloured === 0 || coloured * SPECK < opaque) return null

  // The heaviest 30° window, so a hue split across a bucket edge still wins.
  let best = 0
  let bestWeight = -1
  for (let bucket = 0; bucket < BUCKETS; bucket++) {
    let weight = 0
    for (let offset = -1; offset <= 1; offset++)
      weight += buckets[((bucket + offset + BUCKETS) % BUCKETS) * 4]!
    if (weight > bestWeight) {
      best = bucket
      bestWeight = weight
    }
  }

  let l = 0
  let a = 0
  let b = 0
  for (let offset = -1; offset <= 1; offset++) {
    const slot = ((best + offset + BUCKETS) % BUCKETS) * 4
    l += buckets[slot + 1]!
    a += buckets[slot + 2]!
    b += buckets[slot + 3]!
  }

  return toHex(
    oklabToLinearSrgb(l / bestWeight, a / bestWeight, b / bestWeight)
  )
}

function toHex(linear: [number, number, number]): string {
  return `#${linear
    .map((channel) => {
      const clamped = Math.min(1, Math.max(0, channel))
      const encoded =
        clamped <= 0.0031308
          ? clamped * 12.92
          : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, '0')
    })
    .join('')}`
}
