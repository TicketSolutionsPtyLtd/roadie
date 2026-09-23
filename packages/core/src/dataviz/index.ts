import { toHex } from './color-math'
import {
  DEFAULT_ACCENT_HUE,
  type GreyName,
  type Mode,
  type StatusName,
  palette
} from './palette'

export { type Oklch, toHex } from './color-math'
export {
  DEFAULT_ACCENT_HUE,
  type GreyName,
  MODES,
  type Mode,
  type Palette,
  type StatusName,
  palette
} from './palette'
export { paletteScores, validatePalette } from './validate'

const SLOTS = palette.categorical.light.length

export function chartColorVar(slot: number): string {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS)
    throw new RangeError(`Chart slot ${slot} is outside 1 to ${SLOTS}`)
  return `var(--chart-${slot})`
}

export function chartHex(mode: Mode, accentHue: number = DEFAULT_ACCENT_HUE) {
  const [l, c] = palette.categorical[mode][0]!
  const grey = (name: GreyName) =>
    toHex(palette.neutral[mode][palette.greys[name][mode].step]!)
  const band = palette.greys.band[mode]
  const statuses = Object.keys(palette.status) as StatusName[]
  const greys = (['context', 'median', 'other', 'missing'] as const).map(
    (g) => [g, grey(g)]
  )

  return {
    categorical: palette.categorical[mode].map(toHex),
    heat: palette.heat[mode].map(toHex),
    diverging: palette.diverging[mode].map(toHex),
    highlight: toHex([l, c, accentHue]),
    status: Object.fromEntries(
      statuses.map((s) => [s, toHex(palette.status[s].value[mode])])
    ) as Record<StatusName, string>,
    greys: Object.fromEntries(greys) as Record<
      Exclude<GreyName, 'band'>,
      string
    >,
    band: {
      color: toHex(palette.neutral[mode][band.step]!),
      opacity: (band.alpha ?? 100) / 100
    }
  }
}
