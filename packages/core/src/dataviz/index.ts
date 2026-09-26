import { toHex } from './color-math'
import {
  DEFAULT_ACCENT_HUE,
  DIVERGE_MID,
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
export {
  type DeltaSentiment,
  type GoodWhen,
  type ValueFormat,
  deltaSentiment,
  describeDelta,
  formatDelta,
  formatValue
} from './format'
export { isWallTime, parseWallTime } from './wallTime'

const SLOTS = palette.categorical.light.length

const CHROME_STEPS = {
  grid: { light: 5, dark: 5 },
  axis: { light: 7, dark: 7 },
  label: { light: 11, dark: 11 },
  value: { light: 13, dark: 13 },
  surface: { light: 1, dark: 2 },
  raised: { light: 1, dark: 3 }
} as const

export function chartColorVar(slot: number): string {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS)
    throw new RangeError(`Chart slot ${slot} is outside 1 to ${SLOTS}`)
  return `var(--chart-${slot})`
}

export function chartHex(mode: Mode, accentHue: number = DEFAULT_ACCENT_HUE) {
  const [l, c] = palette.categorical[mode][0]!
  const neutral = (step: number) => {
    const [nl, nc] = palette.neutral[mode][step]!
    return toHex([nl, nc, accentHue])
  }
  const grey = (name: GreyName) => neutral(palette.greys[name][mode].step)
  const band = palette.greys.band[mode]
  const statuses = Object.keys(palette.status) as StatusName[]
  const greys = (['context', 'median', 'other', 'missing'] as const).map(
    (g) => [g, grey(g)]
  )

  return {
    categorical: palette.categorical[mode].map(toHex),
    heat: palette.heat[mode].map(toHex),
    diverging: palette.diverging[mode].map((color, i) =>
      i === DIVERGE_MID ? neutral(palette.divergeMidStep[mode]) : toHex(color)
    ),
    highlight: toHex([l, c, accentHue]),
    status: Object.fromEntries(
      statuses.map((s) => [s, toHex(palette.status[s].value[mode])])
    ) as Record<StatusName, string>,
    greys: Object.fromEntries(greys) as Record<
      Exclude<GreyName, 'band'>,
      string
    >,
    band: {
      color: neutral(band.step),
      opacity: (band.alpha ?? 100) / 100
    },
    chrome: Object.fromEntries(
      Object.entries(CHROME_STEPS).map(([name, step]) => [
        name,
        neutral(step[mode])
      ])
    ) as Record<keyof typeof CHROME_STEPS, string>
  }
}
