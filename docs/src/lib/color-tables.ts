import { type Mode, chartHex } from '@oztix/roadie-core/dataviz'

import type { TwinCell, TwinTable } from './twin-table'

export const DATAVIZ_STRIPS = {
  categorical: Array.from({ length: 8 }, (_, i) => `chart-${i + 1}`),
  heat: Array.from({ length: 9 }, (_, i) => `chart-heat-${i}`),
  diverging: [
    'chart-diverge-pos-4',
    'chart-diverge-pos-3',
    'chart-diverge-pos-2',
    'chart-diverge-pos-1',
    'chart-diverge-0',
    'chart-diverge-neg-1',
    'chart-diverge-neg-2',
    'chart-diverge-neg-3',
    'chart-diverge-neg-4'
  ],
  status: [
    'chart-status-good',
    'chart-status-warning',
    'chart-status-serious',
    'chart-status-critical'
  ]
} as const

export type DatavizKind = keyof typeof DATAVIZ_STRIPS

export const datavizLabel = (token: string) =>
  token.replace(/^chart-(heat-|diverge-|status-)?/, '')

export function datavizHex(kind: DatavizKind, mode: Mode, index: number) {
  const hex = chartHex(mode)
  const token = DATAVIZ_STRIPS[kind][index]
  const value =
    kind === 'status' && token
      ? hex.status[datavizLabel(token) as keyof typeof hex.status]
      : kind === 'status'
        ? undefined
        : hex[kind][index]
  if (!value)
    throw new Error(`No ${mode} colour for ${token ?? `${kind} ${index}`}`)
  return value
}

const code = (value: string): TwinCell => [{ code: value }]

/** A dataviz set's tokens with their exact light and dark hex, from `chartHex`. */
export const datavizTable = (kind: DatavizKind): TwinTable => ({
  head: ['Token', 'Light', 'Dark'],
  rows: DATAVIZ_STRIPS[kind].map((token, index) => [
    code(`--${token}`),
    code(datavizHex(kind, 'light', index)),
    code(datavizHex(kind, 'dark', index))
  ])
})

const STEP = /^--color-([a-z-]+)-(\d+)$/

export type ColorScale = {
  scale: string
  label: string
  followsAccent: boolean
  steps: { name: string; step: string }[]
}

/** Each colour scale's steps from the token manifest, in manifest order; pinned light steps aren't scales. */
export function colorScales(
  tokens: { name: string; group: string }[],
  followingAccent = false
) {
  const scales = new Map<string, ColorScale>()
  for (const token of tokens) {
    const [, scale, step] = token.name.match(STEP) ?? []
    if (!scale || !step || scale.endsWith('-light')) continue
    const entry = scales.get(scale) ?? {
      scale,
      label: token.group,
      followsAccent: false,
      steps: []
    }
    entry.steps.push({ name: token.name, step })
    entry.followsAccent ||= JSON.stringify(token).includes('var(--accent-hue)')
    scales.set(scale, entry)
  }
  return [...scales.values()].filter(
    ({ followsAccent }) => !followingAccent || followsAccent
  )
}

/** Each scale's label and its first and last step token. */
export const colorScaleTable = (scales: ColorScale[]): TwinTable => ({
  head: ['Scale', 'Steps'],
  rows: scales.map(({ label, steps }) => [
    label,
    [{ code: steps[0]!.name }, ' to ', { code: steps.at(-1)!.name }]
  ])
})
