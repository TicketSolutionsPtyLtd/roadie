import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

import { DATAVIZ_TOKEN_NAMES, renderDatavizCss } from './css'
import { type Palette, palette } from './palette'

const css = renderDatavizCss()
const squash = (s: string) => s.replace(/\s+/g, ' ')
const block = (selectorStart: string) => {
  const start = css.indexOf(selectorStart)
  return css.slice(start, css.indexOf('}', start))
}

describe('dataviz.css', () => {
  it('is generated from palette.ts. Run `pnpm --filter @oztix/roadie-core test -u` after a palette change', async () => {
    await expect(css).toMatchFileSnapshot('../css/dataviz.css')
  })

  it('declares no hex copy of a colour', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  // A palette that moves every case the generator branches on: a status fixed
  // in one mode, a grey mixed in one mode, and a band with no alpha.
  const variant: Palette = {
    ...palette,
    status: {
      ...palette.status,
      good: { ...palette.status.good, step: { light: 11, dark: null } }
    },
    greys: {
      ...palette.greys,
      context: {
        light: { step: 8, mix: { step: 9, percent: 20 } },
        dark: { step: 8 }
      },
      other: { light: { step: 9 }, dark: { step: 9 } },
      band: { light: { step: 9 }, dark: { step: 11 } }
    }
  }
  const palettes = [
    [
      'the palette',
      palette,
      ['--chart-context', '--chart-band', '--chart-other']
    ],
    [
      'a palette fixed or mixed in one mode',
      variant,
      ['--chart-context', '--chart-band']
    ]
  ] as const

  it.each(palettes)(
    'declares every token in light and dark, for %s',
    (_, p) => {
      // A token set only on :root would keep its light value in dark mode.
      const css = renderDatavizCss(p)
      const names = (selector: string) =>
        css
          .split(selector)
          .slice(1)
          .flatMap((body) => [
            ...body.slice(0, body.indexOf('}')).matchAll(/--([\w-]+):/g)
          ])
          .map(([, name]) => name!)
      const light = names('\n:root {').concat(names('  :root {')).sort()
      const dark = names('\n.dark {').concat(names('  .dark {')).sort()
      expect(dark).toEqual(light)
      const shared = ['grid', 'axis', 'label', 'value', 'gap', 'highlight']
      expect(
        DATAVIZ_TOKEN_NAMES.filter(
          (name) =>
            !shared.includes(name.replace('chart-', '')) &&
            !light.includes(name)
        )
      ).toEqual([])
    }
  )

  // Outside a color-mix check, the Tailwind build adds a solid copy of each
  // mix and its own @supports block.
  it.each(palettes)(
    'keeps every color-mix behind a color-mix check, for %s',
    (_, p, expected) => {
      const css = renderDatavizCss(p)
      const mixed = css
        .split('\n')
        .filter((line) => /--chart-[\w-]+: color-mix/.test(line))
      expect(
        [...new Set(mixed.map((line) => line.trim().split(':')[0]))].sort()
      ).toEqual([...expected].sort())
      for (const line of mixed) {
        const before = css.slice(0, css.indexOf(line))
        expect(before.slice(before.lastIndexOf('@supports'))).toMatch(
          /^@supports \(color: color-mix\(/
        )
      }
    }
  )

  it('re-declares chart ink wherever intent tokens can change', () => {
    const css = renderDatavizCss()
    const block = css.match(
      /:root, \.dark, \[class\*='intent-'\], \[data-accent-scope\] \{([^}]*)\}/
    )
    expect(block).not.toBeNull()
    for (const name of ['grid', 'axis', 'label', 'value', 'gap'])
      expect(block![1]).toContain(`--chart-${name}: var(--intent-`)
  })

  it('only lets the highlight follow the accent hue', () => {
    const accentLines = css
      .split('\n')
      .filter((line) => line.includes('var(--accent-hue)'))
    expect(accentLines.map((line) => line.trim().split(':')[0])).toEqual([
      '--chart-highlight'
    ])
  })

  it('re-resolves the highlight wherever the mode, intent or accent hue can change', () => {
    const rule = css.match(
      /:root, \.dark, \[class\*='intent-'\], \[style\*='--accent-hue'\] \{([^}]*)\}/
    )
    expect(rule).not.toBeNull()
    expect(rule![1]).toContain(
      '--chart-highlight: oklch(var(--chart-highlight-lc) var(--accent-hue));'
    )
  })

  it('declares the highlight lightness and chroma per mode', () => {
    const [lightL, lightC] = palette.categorical.light[0]!
    const [darkL, darkC] = palette.categorical.dark[0]!
    expect(block(':root {')).toContain(
      `--chart-highlight-lc: ${lightL} ${lightC};`
    )
    expect(block('\n.dark {')).toContain(
      `--chart-highlight-lc: ${darkL} ${darkC};`
    )
  })

  it('re-resolves the pair and trio sets inside a nested .dark subtree', () => {
    const dark = block('\n.dark {')
    for (const name of [
      'chart-pair-1',
      'chart-pair-2',
      'chart-trio-1',
      'chart-trio-2',
      'chart-trio-3'
    ]) {
      expect(dark).toContain(`--${name}:`)
    }
  })

  it('flips on any .dark element, not only the root', () => {
    expect(css).toContain('\n.dark {')
    expect(css).toContain('\n  .dark {')
    expect(css).not.toContain(':root.dark')
  })

  it('exposes bg, fill, stroke and text utilities for every token', async () => {
    const compiler = await compile(`@tailwind utilities;\n${css}`)
    const built = squash(
      compiler.build([
        'fill-chart-1',
        'stroke-chart-highlight',
        'bg-chart-heat-8',
        'text-chart-diverge-neg-4'
      ])
    )
    expect(built).toContain('.fill-chart-1 { fill: var(--chart-1)')
    expect(built).toContain(
      '.stroke-chart-highlight { stroke: var(--chart-highlight)'
    )
    expect(built).toContain(
      '.bg-chart-heat-8 { background-color: var(--chart-heat-8)'
    )
    expect(built).toContain(
      '.text-chart-diverge-neg-4 { color: var(--chart-diverge-neg-4)'
    )
  })
})
