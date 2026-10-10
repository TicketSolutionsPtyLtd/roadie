import type { TokenEntry, TokenFamily } from '@roadie-core/tokens'

import type { TwinTable } from './twin-table'

const REM_PX = 16

const remToPx = (rem: string) => `${parseFloat(rem) * REM_PX}px`

const inGroup = (tokens: TokenEntry[], family: TokenFamily, group: string) =>
  tokens.filter(
    (token) =>
      token.family === family &&
      token.group === group &&
      token.kind === 'variable'
  )

function valueOf(tokens: TokenEntry[], name: string) {
  const value = tokens.find((token) => token.name === name)?.value?.light
  if (!value) throw new Error(`No ${name} token in the manifest.`)
  return value
}

const spacingRem = (tokens: TokenEntry[]) =>
  parseFloat(valueOf(tokens, '--spacing'))

export type Size = { name: string; size: string }

const sized = (name: string, rem: string): Size => ({
  name,
  size: `${rem} (${remToPx(rem)})`
})

/** The viewport breakpoints, each with its variant prefix and width. */
export const breakpoints = (tokens: TokenEntry[]) =>
  inGroup(tokens, 'shape', 'Breakpoints').map(({ name, value }) =>
    sized(`${name.replace('--breakpoint-', '')}:`, value!.light!)
  )

/** The container widths, each with its `container-*` class and max width. */
export const containers = (tokens: TokenEntry[]) =>
  inGroup(tokens, 'shape', 'Containers').map(({ name, value }) =>
    sized(name.replace('--container-', 'container-'), value!.light!)
  )

const sizeTable = (head: string[], sizes: Size[]): TwinTable => ({
  head,
  rows: sizes.map(({ name, size }) => [[{ code: name }], size])
})

export const breakpointTable = (tokens: TokenEntry[]) =>
  sizeTable(['Prefix', 'Width'], breakpoints(tokens))

export const containerTable = (tokens: TokenEntry[]) =>
  sizeTable(['Class', 'Max width'], containers(tokens))

// The steps layouts reach for. Tailwind accepts any multiple of the unit.
const SPACING_STEPS = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]

/** Common spacing steps, each with its size in pixels. */
export const spacingSteps = (tokens: TokenEntry[]) =>
  SPACING_STEPS.map((step) => ({
    step,
    px: remToPx(`${step * spacingRem(tokens)}rem`)
  }))

export const spacingTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Step', 'Size'],
  rows: spacingSteps(tokens).map(({ step, px }) => [
    [{ code: String(step) }],
    px
  ])
})

// Tailwind ships it, but Roadie's tiers start at rounded-sm.
const BELOW_TIERS = '--radius-xs'

/** The radius tiers, then `rounded-full`, which has no token behind it. */
export const radii = (tokens: TokenEntry[]) => [
  ...inGroup(tokens, 'shape', 'Radius')
    .filter(({ name }) => name !== BELOW_TIERS)
    .map(({ name, value }) => ({
      utility: name.replace('--radius-', 'rounded-'),
      rem: value!.light!,
      label: `${remToPx(value!.light!)} (${value!.light!})`
    })),
  { utility: 'rounded-full', rem: undefined, label: 'Fully round' }
]

export const radiusTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Class', 'Radius'],
  rows: radii(tokens).map(({ utility, label }) => [[{ code: utility }], label])
})

/** The z-index tiers, top of the stack first. */
export const layeringTiers = (tokens: TokenEntry[]) =>
  inGroup(tokens, 'elevation', 'Layering')
    .map(({ name, value }) => ({
      utility: name.replace('--z-index-', 'z-'),
      value: value!.light!
    }))
    .sort((a, b) => Number(b.value) - Number(a.value))

export const layeringTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['z-index', 'Class'],
  rows: layeringTiers(tokens).map(({ utility, value }) => [
    value,
    [{ code: utility }]
  ])
})

// Literal class names, so Tailwind finds them in this file.
const ICON_SIZES = [
  { step: 3, className: 'size-3' },
  { step: 4, className: 'size-4' },
  { step: 5, className: 'size-5' },
  { step: 6, className: 'size-6' }
]

/** The icon size tiers, each with its `size-*` class and size in pixels. */
export const iconSizes = (tokens: TokenEntry[]) =>
  ICON_SIZES.map(({ step, className }) => ({
    className,
    px: remToPx(`${step * spacingRem(tokens)}rem`)
  }))

export const iconSizeTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Class', 'Size'],
  rows: iconSizes(tokens).map(({ className, px }) => [
    [{ code: className }],
    px
  ])
})

const remPx = (rem: string) => parseFloat(rem) * REM_PX

/** `0.75rem` as 12px, and a fluid `clamp(min, …, max)` as its range. */
function sizeLabel(value: string) {
  const fluid = value.match(/^clamp\(\s*([\d.]+rem)\s*,.*,\s*([\d.]+rem)\s*\)$/)
  return fluid
    ? `${remPx(fluid[1]!)} to ${remPx(fluid[2]!)}px`
    : `${remPx(value)}px`
}

/** Every font size step, with its size or fluid range. */
export const typeSteps = (tokens: TokenEntry[]) =>
  inGroup(tokens, 'typography', 'Font sizes').map(({ name, value }) => ({
    name,
    step: name.replace('--text-', ''),
    value: value!.light!,
    size: sizeLabel(value!.light!)
  }))

export const typeScaleTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Step', 'Size'],
  rows: typeSteps(tokens).map(({ step, size }) => [[{ code: step }], size])
})

const TEXT_CONTEXTS = ['display', 'ui', 'prose', 'code']

/** Line height and letter spacing for each text context. */
export const rhythmTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Context', 'Line height', 'Letter spacing'],
  rows: TEXT_CONTEXTS.map((context) => [
    [{ code: context }],
    valueOf(tokens, `--leading-${context}`),
    valueOf(tokens, `--tracking-${context}`)
  ])
})

const FOCUS_RING_LABELS: Record<string, string> = {
  '--focus-ring-width': 'Width',
  '--focus-ring-opacity': 'Opacity in light mode',
  '--focus-ring-opacity-dark': 'Opacity in dark mode'
}

/** The focus ring tokens, each with what it sets and its value. */
export function focusRing(tokens: TokenEntry[]) {
  const ring = inGroup(tokens, 'emphasis', 'Focus ring')
  const missing = Object.keys(FOCUS_RING_LABELS).filter(
    (name) => !ring.some((token) => token.name === name)
  )
  if (missing.length)
    throw new Error(`No focus ring token ${missing.join(', ')}`)
  return ring.map(({ name, value }) => ({
    name,
    label: FOCUS_RING_LABELS[name] ?? name,
    value: value!.light!
  }))
}

export const focusRingTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Sets', 'Token', 'Value'],
  rows: focusRing(tokens).map(({ name, label, value }) => [
    label,
    [{ code: name }],
    value
  ])
})

const TRANSITION = '--interactive-transition'

const variable = (reference: string) =>
  /^var\((--[\w-]+)\)$/.exec(reference)?.[1]

/** Each property `is-interactive` animates, with its duration and easing token. */
export const transitions = (tokens: TokenEntry[]) =>
  valueOf(tokens, TRANSITION)
    .split(',')
    .map((part) => {
      const [property, duration, easing] = part.trim().split(/\s+/)
      const durationName = variable(duration ?? '')
      const easingName = variable(easing ?? '')
      if (!property || !durationName || !easingName)
        throw new Error(`Can't read "${part.trim()}" in ${TRANSITION}.`)
      return {
        property,
        duration: valueOf(tokens, durationName),
        easing: easingName.slice(2)
      }
    })

export const transitionTable = (tokens: TokenEntry[]): TwinTable => ({
  head: ['Property', 'Duration', 'Easing'],
  rows: transitions(tokens).map(({ property, duration, easing }) => [
    [{ code: property }],
    duration,
    [{ code: easing }]
  ])
})

/** `DEFAULT_ACCENT_COLOR`, then the CSS default of each accent property. */
export const accentDefaults = (
  tokens: TokenEntry[],
  defaultAccentColor: string
) => [
  { name: 'DEFAULT_ACCENT_COLOR', value: defaultAccentColor, fromToken: false },
  ...inGroup(tokens, 'color-scales', 'Accent parameters').map(
    ({ name, value }) => ({ name, value: value!.light!, fromToken: true })
  )
]

export const accentDefaultsTable = (
  tokens: TokenEntry[],
  defaultAccentColor: string
): TwinTable => ({
  head: ['Name', 'Default'],
  rows: accentDefaults(tokens, defaultAccentColor).map(({ name, value }) => [
    [{ code: name }],
    value
  ])
})
