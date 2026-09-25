import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PLOT_HEIGHTS } from '../Chart/context'

const css = readFileSync(join(import.meta.dirname, 'charts.css'), 'utf-8')

describe('charts.css', () => {
  it('textures every series slot under forced colours', () => {
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'))
    for (let slot = 1; slot <= 8; slot++)
      expect(forced).toContain(`[data-ts-key^='series-${slot}:']`)
  })

  // ChartPlot spaces end labels from PLOT_HEIGHTS before it measures the box.
  it.each(Object.entries(PLOT_HEIGHTS))(
    'starts the %s plot at the height ChartPlot assumes',
    (size, height) => {
      const sized = new RegExp(
        `\\[data-slot='chart'\\]\\[data-size='${size}'\\] \\{\\s*--chart-plot-height: ([^;]+);`
      ).exec(css)
      const fallback =
        /\[data-slot='chart'\] \{\s*--chart-plot-height: ([^;]+);/.exec(css)
      const value = (sized ?? fallback)?.[1] ?? ''
      const minimum = /^(?:clamp\()?(\d+)px/.exec(value)?.[1]
      expect(Number(minimum)).toBe(height)
    }
  )

  it('haloes every label mark', () => {
    expect(css).toMatch(/\[data-ts-key\^='label-'\] \{[^}]*paint-order: stroke/)
  })
})
