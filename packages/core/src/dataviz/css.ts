import type { Oklch } from './color-math'
import {
  DIVERGE_MID,
  type GreyName,
  MODES,
  type Mode,
  type Palette,
  type StatusName,
  palette as defaultPalette
} from './palette'

const STATUS: StatusName[] = ['good', 'warning', 'serious', 'critical']
const GREYS: GreyName[] = ['context', 'band', 'median', 'other', 'missing']
const LINE_GREYS = GREYS.filter((g) => g !== 'band')
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

function direct(p: Palette, mode: Mode): string[] {
  return [
    ...p.categorical[mode].map((c, i) => decl(`chart-${i + 1}`, oklch(c))),
    ...p.heat[mode].map((c, i) => decl(`chart-heat-${i}`, oklch(c))),
    ...p.diverging[mode].flatMap((c, i) =>
      i === DIVERGE_MID
        ? []
        : [decl(`chart-diverge-${divergeName(i)}`, oklch(c))]
    ),
    decl('chart-diverge-0', `var(--color-neutral-${p.divergeMidStep[mode]})`),
    ...STATUS.map((s) => {
      const { intent, step, value } = p.status[s]
      return decl(
        `chart-status-${s}`,
        step[mode] === null
          ? oklch(value[mode])
          : `var(--color-${intent}-${step[mode]})`
      )
    })
  ]
}

const mixed = (p: Palette, g: GreyName) =>
  g === 'band' || MODES.some((m) => p.greys[g][m].mix)

function grey(p: Palette, mode: Mode, name: GreyName) {
  const { step, alpha = 100, mix } = p.greys[name][mode]
  if (name === 'band')
    return `color-mix(in oklch, var(--color-neutral-${step}) ${alpha}%, transparent)`
  if (!mix) return `var(--color-neutral-${step})`
  return `color-mix(in oklch, var(--color-neutral-${step}), var(--color-neutral-${mix.step}) ${mix.percent}%)`
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

function modeBlock(p: Palette, mode: Mode) {
  const [l, c] = p.categorical[mode][0]!
  return [
    ...direct(p, mode),
    decl('chart-highlight-lc', `${l} ${c}`),
    ...LINE_GREYS.filter((g) => !mixed(p, g)).map((g) =>
      decl(`chart-${g}`, grey(p, mode, g))
    ),
    ...sets(p)
  ]
}

const inkBlock = [
  ":root, .dark, [class*='intent-'], [data-accent-scope] {",
  ...Object.entries(INK).map(([name, value]) => `  --chart-${name}: ${value};`),
  '}'
]

const highlightBlock = [
  ":root, .dark, [class*='intent-'], [style*='--accent-hue'] {",
  '  --chart-highlight: oklch(var(--chart-highlight-lc) var(--accent-hue));',
  '}'
]

export function renderDatavizCss(p: Palette = defaultPalette): string {
  const theme = DATAVIZ_TOKEN_NAMES.map((name) =>
    decl(`color-${name}`, `var(--${name})`)
  )
  const indent = (lines: string[]) => lines.map((line) => `  ${line}`)
  // Outside this check, the Tailwind build adds a solid copy of each mix and
  // its own @supports block.
  const mixes = (mode: Mode) =>
    GREYS.filter((g) => mixed(p, g)).map((g) =>
      decl(`chart-${g}`, grey(p, mode, g))
    )

  return [
    '/* Generated from src/dataviz/palette.ts by src/dataviz/css.test.ts.',
    '   Edit the palette, then run `pnpm --filter @oztix/roadie-core test -u`. */',
    '',
    '@theme inline {',
    ...theme,
    '}',
    '',
    ':root {',
    ...modeBlock(p, 'light'),
    '}',
    '',
    '.dark {',
    ...modeBlock(p, 'dark'),
    '}',
    '',
    ...inkBlock,
    '',
    ...highlightBlock,
    '',
    '@supports (color: color-mix(in oklch, red, red)) {',
    '  :root {',
    ...indent(mixes('light')),
    '  }',
    '',
    '  .dark {',
    ...indent(mixes('dark')),
    '  }',
    '}',
    ''
  ].join('\n')
}
