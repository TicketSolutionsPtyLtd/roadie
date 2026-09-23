export type Oklch = readonly [lightness: number, chroma: number, hue: number]
export type Cvd = 'protan' | 'deutan' | 'tritan'

type Vec3 = [number, number, number]
type Matrix = readonly [Vec3, Vec3, Vec3]

// Machado, Oliveira and Fernandes (2009), severity 1.0, applied in linear sRGB.
const MACHADO: Record<Cvd, Matrix> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039]
  ]
}

const clip = (v: number) => Math.min(1, Math.max(0, v))

function toOklab([l, c, h]: Oklch): Vec3 {
  const radians = (h * Math.PI) / 180
  return [l, c * Math.cos(radians), c * Math.sin(radians)]
}

function oklabToLinear([L, a, b]: Vec3): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

function linearToOklab([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

const inGamut = (rgb: Vec3) => rgb.every((v) => v >= -0.0005 && v <= 1.0005)

export function clampChroma(color: Oklch): Oklch {
  const [l, c, h] = color
  if (inGamut(oklabToLinear(toOklab(color)))) return color
  let low = 0
  let high = c
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2
    if (inGamut(oklabToLinear(toOklab([l, mid, h])))) low = mid
    else high = mid
  }
  return [l, low, h]
}

function linearRgb(color: Oklch): Vec3 {
  const [r, g, b] = oklabToLinear(toOklab(clampChroma(color)))
  return [clip(r), clip(g), clip(b)]
}

const encode = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055

export function toHex(color: Oklch): string {
  const channels = linearRgb(color).map((v) =>
    Math.round(encode(v) * 255)
      .toString(16)
      .padStart(2, '0')
  )
  return `#${channels.join('')}`
}

function simulate(rgb: Vec3, cvd?: Cvd): Vec3 {
  if (!cvd) return rgb
  const [r, g, b] = rgb
  const [x, y, z] = MACHADO[cvd]
  return [
    clip(x[0] * r + x[1] * g + x[2] * b),
    clip(y[0] * r + y[1] * g + y[2] * b),
    clip(z[0] * r + z[1] * g + z[2] * b)
  ]
}

export function deltaE(a: Oklch, b: Oklch, cvd?: Cvd): number {
  const p = linearToOklab(simulate(linearRgb(a), cvd))
  const q = linearToOklab(simulate(linearRgb(b), cvd))
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

export function worstCvdDeltaE(a: Oklch, b: Oklch): number {
  return Math.min(
    deltaE(a, b, 'protan'),
    deltaE(a, b, 'deutan'),
    deltaE(a, b, 'tritan')
  )
}

function luminance(color: Oklch): number {
  const [r, g, b] = linearRgb(color)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: Oklch, b: Oklch): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
