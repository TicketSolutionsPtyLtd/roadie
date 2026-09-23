import { describe, expect, it } from 'vitest'

import { chartColorVar, chartHex, palette, toHex } from './index'

describe('@oztix/roadie-core/dataviz', () => {
  it('gives an inline-style variable for a slot so dynamic indexes survive purging', () => {
    expect(chartColorVar(1)).toBe('var(--chart-1)')
    expect(chartColorVar(8)).toBe('var(--chart-8)')
  })

  it('refuses slots the palette does not have', () => {
    expect(() => chartColorVar(0)).toThrow(RangeError)
    expect(() => chartColorVar(9)).toThrow(RangeError)
    expect(() => chartColorVar(1.5)).toThrow(RangeError)
  })

  it('resolves hex values for renderers that cannot read CSS variables', () => {
    const light = chartHex('light')
    expect(light.categorical).toHaveLength(8)
    expect(light.categorical[0]).toBe(toHex(palette.categorical.light[0]!))
    expect(light.heat).toHaveLength(9)
    expect(light.diverging[4]).toBe(toHex(palette.neutral.light[3]!))
    expect(light.status.critical).toBe(
      toHex(palette.status.critical.value.light)
    )
    expect(light.band.opacity).toBe(0.1)
  })

  it('keeps data hues fixed when the accent hue changes', () => {
    const brand = chartHex('dark')
    const themed = chartHex('dark', 150)
    expect(themed.highlight).not.toBe(brand.highlight)
    expect(themed.categorical).toEqual(brand.categorical)
    expect(themed.heat).toEqual(brand.heat)
    expect(themed.status).toEqual(brand.status)
    expect(themed.diverging.filter((_, i) => i !== 4)).toEqual(
      brand.diverging.filter((_, i) => i !== 4)
    )
  })

  it('tints neutrals with the accent hue, as the CSS neutral scale does', () => {
    const brand = chartHex('light')
    const themed = chartHex('light', 150)
    expect(themed.greys.context).not.toBe(brand.greys.context)
    expect(themed.band.color).not.toBe(brand.band.color)
    expect(themed.diverging[4]).not.toBe(brand.diverging[4])
    const [l, c] = palette.neutral.light[8]!
    expect(themed.greys.context).toBe(toHex([l, c, 150]))
  })
})
