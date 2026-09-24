import { type Oklch, toHex } from './color-math'
import {
  DEFAULT_ACCENT_HUE,
  DIVERGE_MID,
  type GreyName,
  type Mode,
  type Palette,
  type StatusName,
  palette as defaultPalette
} from './palette'

const STATUS: StatusName[] = ['good', 'warning', 'serious', 'critical']
const GREYS: GreyName[] = ['context', 'band', 'median', 'other', 'missing']
const INK = {
  grid: 'var(--intent-border-subtler)',
  axis: 'var(--intent-border-normal)',
  label: 'var(--intent-text-subtle)',
  value: 'var(--intent-text-strong)',
  gap: 'var(--intent-bg-normal)'
} as const

const divergeName = (i: number) =>
  i < DIVERGE_MID
    ? `pos-${DIVERGE_MID - i}`
    : i === DIVERGE_MID
      ? '0'
      : `neg-${i - DIVERGE_MID}`

export const DATAVIZ_TOKEN_NAMES: readonly string[] = [
  ...Array.from({ length: 8 }, (_, i) => `chart-${i + 1}`),
  'chart-pair-1',
  'chart-pair-2',
  'chart-trio-1',
  'chart-trio-2',
  'chart-trio-3',
  ...Array.from({ length: 9 }, (_, i) => `chart-heat-${i}`),
  ...Array.from({ length: 9 }, (_, i) => `chart-diverge-${divergeName(i)}`),
  ...STATUS.map((s) => `chart-status-${s}`),
  'chart-highlight',
  ...GREYS.map((g) => `chart-${g}`),
  ...Object.keys(INK).map((k) => `chart-${k}`)
]

const oklch = ([l, c, h]: Oklch) => `oklch(${l} ${c} ${h})`
const decl = (name: string, value: string) => `  --${name}: ${value};`
const alphaHex = (percent: number) =>
  Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')

type Direct = [name: string, color: Oklch]

function direct(p: Palette, mode: Mode): Direct[] {
  return [
    ...p.categorical[mode].map((c, i): Direct => [`chart-${i + 1}`, c]),
    ...p.heat[mode].map((c, i): Direct => [`chart-heat-${i}`, c]),
    ...p.diverging[mode].flatMap((c, i): Direct[] =>
      i === DIVERGE_MID ? [] : [[`chart-diverge-${divergeName(i)}`, c]]
    )
  ]
}

function aliases(p: Palette, mode: Mode): [string, string][] {
  const grey = (name: GreyName) =>
    `var(--color-neutral-${p.greys[name][mode].step})`
  return [
    ['chart-diverge-0', `var(--color-neutral-${p.divergeMidStep[mode]})`],
    ...STATUS.map((s): [string, string] => [
      `chart-status-${s}`,
      `var(--color-${p.status[s].intent}-${p.status[s].step[mode]})`
    ]),
    ...GREYS.filter((g) => g !== 'band').map((g): [string, string] => [
      `chart-${g}`,
      grey(g)
    ])
  ]
}

function band(p: Palette, mode: Mode, modern: boolean) {
  const { step, alpha = 100 } = p.greys.band[mode]
  return modern
    ? `color-mix(in oklch, var(--color-neutral-${step}) ${alpha}%, transparent)`
    : `${toHex(p.neutral[mode][step]!)}${alphaHex(alpha)}`
}

// var() resolves where it is declared, so sets must be re-declared in .dark.
const sets = (p: Palette) => [
  ...p.sets.pair.map((slot, i) =>
    decl(`chart-pair-${i + 1}`, `var(--chart-${slot})`)
  ),
  ...p.sets.trio.map((slot, i) =>
    decl(`chart-trio-${i + 1}`, `var(--chart-${slot})`)
  )
]

function modeBlock(p: Palette, mode: Mode, modern: boolean) {
  const lines = direct(p, mode).map(([name, c]) =>
    decl(name, modern ? oklch(c) : toHex(c))
  )
  const [l, c] = p.categorical[mode][0]!
  lines.push(
    decl(
      'chart-highlight',
      modern
        ? `oklch(${l} ${c} var(--accent-hue))`
        : toHex([l, c, DEFAULT_ACCENT_HUE])
    ),
    decl('chart-band', band(p, mode, modern))
  )
  if (!modern)
    lines.push(...aliases(p, mode).map(([n, v]) => decl(n, v)), ...sets(p))
  return lines
}

const inkBlock = [
  ":root, .dark, [class*='intent-'] {",
  ...Object.entries(INK).map(([name, value]) => `  --chart-${name}: ${value};`),
  '}'
]

export function renderDatavizCss(p: Palette = defaultPalette): string {
  const theme = DATAVIZ_TOKEN_NAMES.map((name) =>
    decl(`color-${name}`, `var(--${name})`)
  )
  const indent = (lines: string[]) => lines.map((line) => `  ${line}`)

  return [
    '/* Generated from src/dataviz/palette.ts by src/dataviz/css.test.ts.',
    '   Edit the palette, then run `pnpm --filter @oztix/roadie-core test -u`. */',
    '',
    '@theme inline {',
    ...theme,
    '}',
    '',
    ':root {',
    ...modeBlock(p, 'light', false),
    '}',
    '',
    '.dark {',
    ...modeBlock(p, 'dark', false),
    '}',
    '',
    ...inkBlock,
    '',
    '@supports (color: oklch(0 0 0)) {',
    '  :root {',
    ...indent(modeBlock(p, 'light', true)),
    '  }',
    '',
    '  .dark {',
    ...indent(modeBlock(p, 'dark', true)),
    '  }',
    '}',
    ''
  ].join('\n')
}
