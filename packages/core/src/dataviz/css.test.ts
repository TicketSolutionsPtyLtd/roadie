import { readFileSync } from 'node:fs'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

import { toHex } from './color-math'
import { DATAVIZ_TOKEN_NAMES, renderDatavizCss } from './css'
import { DEFAULT_ACCENT_HUE, palette } from './palette'

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

  it('gives every token a fallback outside @supports so old browsers still get colour', () => {
    const inkNames = ['grid', 'axis', 'label', 'value', 'gap'].map(
      (name) => `chart-${name}`
    )
    const fallbackLight = block(':root {')
    for (const name of DATAVIZ_TOKEN_NAMES.filter(
      (name) => !inkNames.includes(name)
    )) {
      expect(fallbackLight).toContain(`--${name}:`)
    }
    expect(fallbackLight).toMatch(/--chart-highlight: #[0-9a-f]{6};/)
    expect(fallbackLight).toMatch(/--chart-band: #[0-9a-f]{8};/)

    const inkFallback = block(":root, .dark, [class*='intent-'] {")
    for (const name of inkNames) {
      expect(inkFallback).toContain(`--${name}:`)
    }
  })

  it('re-declares chart ink wherever intent tokens can change', () => {
    const css = renderDatavizCss()
    const block = css.match(/:root, \.dark, \[class\*='intent-'\] \{([^}]*)\}/)
    expect(block).not.toBeNull()
    for (const name of ['grid', 'axis', 'label', 'value', 'gap'])
      expect(block![1]).toContain(`--chart-${name}: var(--intent-`)
  })

  it('uses the default accent hue for the highlight hex fallback', () => {
    const css = renderDatavizCss()
    const [l, c] = palette.categorical.light[0]!
    expect(css).toContain(
      `--chart-highlight: ${toHex([l, c, DEFAULT_ACCENT_HUE])};`
    )
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
    const modern = css.slice(css.indexOf('@supports'))
    const rule = modern.match(
      /:root, \.dark, \[class\*='intent-'\], \[style\*='--accent-hue'\] \{([^}]*)\}/
    )
    expect(rule).not.toBeNull()
    expect(rule![1]).toContain(
      '--chart-highlight: oklch(var(--chart-highlight-lc) var(--accent-hue));'
    )
  })

  it('declares the highlight lightness and chroma per mode', () => {
    const modern = css.slice(css.indexOf('@supports'))
    const [lightL, lightC] = palette.categorical.light[0]!
    const [darkL, darkC] = palette.categorical.dark[0]!
    expect(modern).toContain(`--chart-highlight-lc: ${lightL} ${lightC};`)
    expect(modern).toContain(`--chart-highlight-lc: ${darkL} ${darkC};`)
  })

  it('re-resolves the pair and trio sets inside a nested .dark subtree', () => {
    const fallbackDark = block('\n.dark {')
    for (const name of [
      'chart-pair-1',
      'chart-pair-2',
      'chart-trio-1',
      'chart-trio-2',
      'chart-trio-3'
    ]) {
      expect(fallbackDark).toContain(`--${name}:`)
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

  it('safelists every utility so the compiled sheet keeps it', () => {
    const safelist = readFileSync(
      new URL('../css/safelist.html', import.meta.url),
      'utf8'
    )
    const classes = new Set(
      safelist
        .match(/class="[^"]*"/g)!
        .flatMap((attr) => attr.slice(7, -1).split(/\s+/))
    )
    const missing = DATAVIZ_TOKEN_NAMES.flatMap((name) =>
      ['bg', 'fill', 'stroke', 'text'].map((prefix) => `${prefix}-${name}`)
    ).filter((cls) => !classes.has(cls))
    expect(missing).toEqual([])
  })
})
