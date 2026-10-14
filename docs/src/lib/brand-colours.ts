import type { TokenEntry } from '@roadie-core/tokens'

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

export const BRAND_HUES = {
  neutral: { scale: 'neutral', label: '' },
  blue: { scale: 'brand', label: 'blue' },
  purple: { scale: 'info', label: 'purple' },
  orange: { scale: 'brand-secondary', label: 'orange' },
  green: { scale: 'success', label: 'green' },
  yellow: { scale: 'warning', label: 'yellow' },
  red: { scale: 'danger', label: 'red' }
} as const

export type BrandHue = keyof typeof BRAND_HUES

// Print values for the steps where the brand's colour is Roadie's. The
// neutral, yellow, and Backstage steps changed to Roadie's values and wait on
// new print values.
const CMYK: Record<string, string> = {
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

export type BrandColour = {
  name: string
  token: string
  hex: string
  cmyk: string
}

/** A token's light-mode hex, following a `var()` to the pinned step it names. */
function lightHex(byName: Map<string, TokenEntry>, name: string): string {
  const token = byName.get(name)
  if (!token) throw new Error(`No token ${name}`)
  if (token.value?.fallback) return token.value.fallback
  const alias = /^var\((--[\w-]+)\)$/.exec(token.value?.light ?? '')?.[1]
  if (!alias) throw new Error(`No light hex for ${name}`)
  return lightHex(byName, alias)
}

/** A brand hue's lighting steps, each with its token and light-mode hex. */
export function brandColours(
  tokens: TokenEntry[],
  hue: BrandHue
): BrandColour[] {
  const byName = new Map(tokens.map((token) => [token.name, token]))
  const { scale, label } = BRAND_HUES[hue]
  return LIGHTING.filter(({ step }) => step !== '0' || hue === 'neutral').map(
    ({ name, step }) => {
      const token = `--color-${scale}-${step}`
      return {
        name: label ? `${name} ${label}` : name,
        token,
        hex: lightHex(byName, token),
        cmyk: CMYK[token] ?? ''
      }
    }
  )
}

export const brandColourTable = (
  tokens: TokenEntry[],
  hue: BrandHue
): TwinTable => ({
  head: ['Name', 'Token', 'Hex', 'CMYK'],
  rows: brandColours(tokens, hue).map(({ name, token, hex, cmyk }) => [
    name,
    [{ code: token }],
    [{ code: hex }],
    cmyk
  ])
})
