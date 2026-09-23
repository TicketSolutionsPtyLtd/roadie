import type { Oklch } from './color-math'

export const MODES = ['light', 'dark'] as const
export type Mode = (typeof MODES)[number]
export type ByMode<T> = Readonly<Record<Mode, T>>

export type StatusName = 'good' | 'warning' | 'serious' | 'critical'
export type GreyName = 'context' | 'band' | 'median' | 'other' | 'missing'

type Status = {
  intent: 'success' | 'warning' | 'brand-secondary' | 'danger'
  step: ByMode<number>
  value: ByMode<Oklch>
}

type Grey = ByMode<{ step: number; alpha?: number }>

export type Palette = {
  categorical: ByMode<readonly Oklch[]>
  heat: ByMode<readonly Oklch[]>
  diverging: ByMode<readonly Oklch[]>
  divergeMidStep: ByMode<number>
  sets: { pair: readonly number[]; trio: readonly number[] }
  status: Readonly<Record<StatusName, Status>>
  greys: Readonly<Record<GreyName, Grey>>
  neutral: ByMode<readonly Oklch[]>
  surface: ByMode<Oklch>
}

export const DIVERGE_MID = 4
export const DEFAULT_ACCENT_HUE = 247

const hue = DEFAULT_ACCENT_HUE

// Mirrors the neutral scale in tokens.css at the default accent hue.
const neutral: Palette['neutral'] = {
  light: [
    [1, 0, 0],
    [0.991, 0.004, hue],
    [0.982, 0.007, hue],
    [0.955, 0.011, hue],
    [0.931, 0.014, hue],
    [0.909, 0.019, hue],
    [0.888, 0.022, hue],
    [0.853, 0.028, hue],
    [0.794, 0.038, hue],
    [0.645, 0.039, hue],
    [0.609, 0.037, hue],
    [0.503, 0.032, hue],
    [0.24, 0.024, hue],
    [0.182, 0.015, hue]
  ],
  dark: [
    [0.13, 0.011, hue],
    [0.178, 0.011, hue],
    [0.214, 0.01, hue],
    [0.252, 0.016, hue],
    [0.284, 0.018, hue],
    [0.312, 0.022, hue],
    [0.347, 0.025, hue],
    [0.398, 0.031, hue],
    [0.489, 0.041, hue],
    [0.538, 0.04, hue],
    [0.582, 0.038, hue],
    [0.769, 0.028, hue],
    [0.949, 0.007, hue],
    [0.991, 0.004, hue]
  ]
}

const divergeMidStep = { light: 3, dark: 6 } as const

export const palette: Palette = {
  categorical: {
    light: [
      [0.604, 0.178, 266],
      [0.735, 0.184, 353.4],
      [0.484, 0.062, 199.8],
      [0.82, 0.14, 74],
      [0.46, 0.178, 305],
      [0.655, 0.153, 141.4],
      [0.46, 0.16, 6],
      [0.745, 0.117, 226.8]
    ],
    dark: [
      [0.84, 0.079, 262],
      [0.731, 0.184, 342.3],
      [0.577, 0.094, 186],
      [0.779, 0.123, 80],
      [0.566, 0.187, 298.2],
      [0.9, 0.153, 152.7],
      [0.567, 0.162, 1.5],
      [0.761, 0.106, 235.4]
    ]
  },
  heat: {
    light: [
      [0.97, 0.032, 85],
      [0.889, 0.095, 75.6],
      [0.8, 0.136, 57.5],
      [0.7, 0.191, 26.3],
      [0.615, 0.22, 5],
      [0.531, 0.228, 343.8],
      [0.438, 0.219, 312.5],
      [0.355, 0.19, 294.4],
      [0.28, 0.14, 285]
    ],
    dark: [
      [0.26, 0.04, 285],
      [0.323, 0.115, 291.3],
      [0.395, 0.175, 303.8],
      [0.482, 0.212, 325.6],
      [0.57, 0.215, 350],
      [0.657, 0.205, 15.6],
      [0.745, 0.163, 43.8],
      [0.833, 0.125, 66.3],
      [0.92, 0.086, 85]
    ]
  },
  diverging: {
    light: [
      [0.4, 0.2, 268],
      [0.55, 0.118, 235.8],
      [0.7, 0.115, 212.5],
      [0.835, 0.061, 200],
      neutral.light[divergeMidStep.light]!,
      [0.865, 0.076, 60],
      [0.78, 0.135, 54],
      [0.69, 0.178, 43.5],
      [0.6, 0.2, 30]
    ],
    dark: [
      [0.76, 0.123, 262],
      [0.685, 0.14, 232],
      [0.59, 0.104, 213.5],
      [0.473, 0.069, 205],
      neutral.dark[divergeMidStep.dark]!,
      [0.503, 0.099, 32],
      [0.63, 0.145, 41],
      [0.732, 0.158, 56],
      [0.83, 0.145, 74]
    ]
  },
  divergeMidStep,
  sets: { pair: [1, 2], trio: [1, 2, 3] },
  status: {
    good: {
      intent: 'success',
      step: { light: 11, dark: 9 },
      value: { light: [0.508, 0.09, 183.645], dark: [0.732, 0.129, 185.089] }
    },
    warning: {
      intent: 'warning',
      step: { light: 11, dark: 9 },
      value: { light: [0.576, 0.118, 82.642], dark: [0.841, 0.172, 86.226] }
    },
    serious: {
      intent: 'brand-secondary',
      step: { light: 11, dark: 9 },
      value: { light: [0.569, 0.155, 42], dark: [0.753, 0.155, 42] }
    },
    critical: {
      intent: 'danger',
      step: { light: 11, dark: 9 },
      value: { light: [0.569, 0.181, 28.264], dark: [0.709, 0.184, 28.37] }
    }
  },
  greys: {
    context: { light: { step: 8 }, dark: { step: 9 } },
    band: { light: { step: 9, alpha: 10 }, dark: { step: 11, alpha: 9 } },
    median: { light: { step: 8 }, dark: { step: 8 } },
    other: { light: { step: 9 }, dark: { step: 10 } },
    missing: { light: { step: 5 }, dark: { step: 5 } }
  },
  neutral,
  surface: { light: neutral.light[1]!, dark: neutral.dark[2]! }
}
