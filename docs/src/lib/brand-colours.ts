import type { TokenEntry } from '@roadie-core/tokens'

import { DEFAULT_ACCENT_HUE, toHex } from '@oztix/roadie-core/dataviz'

import type { TwinTable } from './twin-table'

/** The brand's lighting names for the Roadie steps it uses. */
export const LIGHTING = [
  { name: 'Flood', step: '0' },
  { name: 'Wash', step: '2' },
  { name: 'House', step: '5' },
  { name: 'Stage', step: '7' },
  { name: 'Spotlight', step: '9' },
  { name: 'Backstage', step: '11' },
  { name: 'Blackout', step: '12' }
] as const

// Blue, purple, and orange are the brand intents, and the cards name their
// hue aliases. `scale` keys the print values, which follow the scale token.
export const BRAND_HUES = {
  neutral: { scale: 'neutral', alias: 'neutral', label: '', intent: undefined },
  blue: {
    scale: 'brand',
    alias: 'brand-blue',
    label: 'blue',
    intent: 'intent-brand-blue'
  },
  purple: {
    scale: 'info',
    alias: 'brand-purple',
    label: 'purple',
    intent: 'intent-brand-purple'
  },
  orange: {
    scale: 'brand-secondary',
    alias: 'brand-orange',
    label: 'orange',
    intent: 'intent-brand-orange'
  },
  green: {
    scale: 'success',
    alias: 'success',
    label: 'green',
    intent: undefined
  },
  yellow: {
    scale: 'warning',
    alias: 'warning',
    label: 'yellow',
    intent: undefined
  },
  red: { scale: 'danger', alias: 'danger', label: 'red', intent: undefined }
} as const

export type BrandHue = keyof typeof BRAND_HUES

// Print values from the brand guidelines, for the steps where the brand's
// colour is Roadie's.
const BRAND_CMYK: Record<string, string> = {
  '--color-neutral-0': '0, 0, 0, 0',
  '--color-brand-2': '4, 2, 0, 0',
  '--color-brand-5': '21, 5, 0, 0',
  '--color-brand-7': '40, 15, 0, 0',
  '--color-brand-9': '85, 25, 0, 0',
  '--color-brand-12': '100, 40, 0, 65',
  '--color-info-2': '3, 4, 0, 0',
  '--color-info-5': '10, 18, 0, 0',
  '--color-info-7': '25, 35, 0, 0',
  '--color-info-9': '50, 69, 0, 0',
  '--color-info-12': '75, 90, 0, 45',
  '--color-brand-secondary-2': '0, 5, 8, 0',
  '--color-brand-secondary-5': '0, 25, 35, 0',
  '--color-brand-secondary-7': '0, 40, 55, 0',
  '--color-brand-secondary-9': '0, 50, 65, 0',
  '--color-brand-secondary-12': '40, 80, 100, 45',
  '--color-success-2': '8, 0, 5, 0',
  '--color-success-5': '35, 0, 20, 0',
  '--color-success-7': '55, 0, 30, 0',
  '--color-success-9': '70, 0, 35, 0',
  '--color-success-12': '90, 30, 60, 55',
  '--color-danger-2': '0, 5, 3, 0',
  '--color-danger-5': '0, 25, 15, 0',
  '--color-danger-7': '5, 40, 25, 0',
  '--color-danger-9': '0, 60, 45, 0',
  '--color-danger-12': '40, 80, 85, 45'
}

// The brand's screen values for the same steps. Roadie's tokens are OKLCH,
// and converting them back puts five of these off by a unit or more in a
// channel (orange House by four).
const BRAND_HEX: Record<string, string> = {
  '--color-neutral-0': '#ffffff',
  '--color-brand-2': '#f1f6fb',
  '--color-brand-5': '#c2dffb',
  '--color-brand-7': '#92c1ee',
  '--color-brand-9': '#0191eb',
  '--color-brand-12': '#04365b',
  '--color-info-2': '#f7f4fc',
  '--color-info-5': '#e1d1fb',
  '--color-info-7': '#c8acf0',
  '--color-info-9': '#a96af1',
  '--color-info-12': '#431e69',
  '--color-brand-secondary-2': '#fef2ee',
  '--color-brand-secondary-5': '#ffc3a8',
  '--color-brand-secondary-7': '#ff9e78',
  '--color-brand-secondary-9': '#ff8a5c',
  '--color-brand-secondary-12': '#5f270f',
  '--color-success-2': '#edf9f7',
  '--color-success-5': '#a1eae0',
  '--color-success-7': '#61cec1',
  '--color-success-9': '#00c2b3',
  '--color-success-12': '#02453f',
  '--color-danger-2': '#fdf2f1',
  '--color-danger-5': '#ffc2b7',
  '--color-danger-7': '#f5a296',
  '--color-danger-9': '#ff6b5c',
  '--color-danger-12': '#592b25'
}

// The steps that changed to Roadie's values: each light hex converted from
// sRGB through Ghostscript's default coated CMYK profile, relative
// colorimetric, rounded. Screen-to-print equivalents until a proof confirms
// them.
const DERIVED_CMYK: Record<string, string> = {
  '--color-neutral-2': '2, 0, 0, 0',
  '--color-neutral-5': '14, 7, 3, 0',
  '--color-neutral-7': '23, 12, 5, 0',
  '--color-neutral-9': '58, 39, 27, 1',
  '--color-neutral-11': '79, 62, 45, 29',
  '--color-neutral-12': '81, 70, 60, 83',
  '--color-brand-11': '100, 76, 25, 9',
  '--color-info-11': '74, 97, 0, 0',
  '--color-brand-secondary-11': '27, 88, 100, 31',
  '--color-success-11': '100, 41, 70, 34',
  '--color-warning-2': '0, 1, 10, 0',
  '--color-warning-5': '0, 10, 67, 0',
  '--color-warning-7': '5, 24, 86, 0',
  '--color-warning-9': '13, 33, 100, 0',
  '--color-warning-11': '45, 59, 100, 38',
  '--color-warning-12': '58, 62, 89, 67',
  '--color-danger-11': '23, 100, 100, 26'
}

export type BrandColour = {
  name: string
  token: string
  hex: string
  cmyk: string
  /** The CMYK is converted from the screen value, not set by the brand. */
  derived: boolean
}

/** A token's light-mode hex, following a `var()` to the pinned step it names. */
function lightHex(byName: Map<string, TokenEntry>, name: string): string {
  const brand = BRAND_HEX[name]
  if (brand) return brand
  const token = byName.get(name)
  if (!token) throw new Error(`No token ${name}`)
  const light = token.value?.light ?? ''
  const alias = /^var\((--[\w-]+)\)$/.exec(light)?.[1]
  if (alias) return lightHex(byName, alias)
  const oklch =
    /^oklch\(([\d.]+) ([\d.]+) (?:([\d.]+)|var\(--accent-hue\))\)$/.exec(light)
  if (!oklch) throw new Error(`No light hex for ${name}`)
  const [, l, c, h = DEFAULT_ACCENT_HUE] = oklch
  return toHex([Number(l), Number(c), Number(h)])
}

/** A brand hue's lighting steps, each with its token, light-mode hex, and print value. */
export function brandColours(
  tokens: TokenEntry[],
  hue: BrandHue
): BrandColour[] {
  const byName = new Map(tokens.map((token) => [token.name, token]))
  const { scale, alias, label } = BRAND_HUES[hue]
  return LIGHTING.filter(({ step }) => step !== '0' || hue === 'neutral').map(
    ({ name, step }) => {
      const scaleToken = `--color-${scale}-${step}`
      const token = `--color-${alias}-${step}`
      const derived = !Object.hasOwn(BRAND_CMYK, scaleToken)
      const cmyk = BRAND_CMYK[scaleToken] ?? DERIVED_CMYK[scaleToken]
      if (!cmyk) throw new Error(`No CMYK for ${scaleToken}`)
      return {
        name: label ? `${name} ${label}` : name,
        token,
        hex: lightHex(byName, token),
        cmyk,
        derived
      }
    }
  )
}

export const brandColourTable = (
  tokens: TokenEntry[],
  hue: BrandHue
): TwinTable => ({
  head: ['Name', 'Token', 'Hex', 'CMYK'],
  rows: brandColours(tokens, hue).map(({ name, token, hex, cmyk, derived }) => [
    name,
    [{ code: token }],
    [{ code: hex }],
    [{ code: derived ? `${cmyk} (derived)` : cmyk }]
  ])
})
