import {
  DEFAULT_ACCENT_HUE,
  type Mode,
  chartHex,
  palette
} from '@oztix/roadie-core/dataviz'

import type { ChartPaint } from './types'

const token = (name: string) => `var(--chart-${name})`
const DIVERGE_NAMES = [
  'pos-4',
  'pos-3',
  'pos-2',
  'pos-1',
  '0',
  'neg-1',
  'neg-2',
  'neg-3',
  'neg-4'
]

export const cssPaint: ChartPaint = {
  highlight: token('highlight'),
  context: token('context'),
  other: token('other'),
  missing: token('missing'),
  median: token('median'),
  band: token('band'),
  bandOpacity: 1,
  categorical: Array.from({ length: 8 }, (_, i) => token(String(i + 1))),
  pair: [token('pair-1'), token('pair-2')],
  trio: [token('trio-1'), token('trio-2'), token('trio-3')],
  heat: Array.from({ length: 9 }, (_, i) => token(`heat-${i}`)),
  diverging: DIVERGE_NAMES.map((name) => token(`diverge-${name}`)),
  status: {
    good: token('status-good'),
    warning: token('status-warning'),
    serious: token('status-serious'),
    critical: token('status-critical')
  },
  grid: token('grid'),
  axis: token('axis'),
  label: token('label'),
  value: token('value'),
  surface: token('gap')
}

export function hexPaint(
  mode: Mode,
  accentHue: number = DEFAULT_ACCENT_HUE
): ChartPaint {
  const hex = chartHex(mode, accentHue)
  const slot = (n: number) => hex.categorical[n - 1]!
  return {
    highlight: hex.highlight,
    context: hex.greys.context,
    other: hex.greys.other,
    missing: hex.greys.missing,
    median: hex.greys.median,
    band: hex.band.color,
    bandOpacity: hex.band.opacity,
    categorical: hex.categorical,
    pair: palette.sets.pair.map(slot),
    trio: palette.sets.trio.map(slot),
    heat: hex.heat,
    diverging: hex.diverging,
    status: hex.status,
    grid: hex.chrome.grid,
    axis: hex.chrome.axis,
    label: hex.chrome.label,
    value: hex.chrome.value,
    surface: hex.chrome.surface
  }
}
