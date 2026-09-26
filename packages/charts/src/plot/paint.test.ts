import { describe, expect, it } from 'vitest'

import { chartHex } from '@oztix/roadie-core/dataviz'

import { cssPaint, hexPaint } from './paint'

describe('paints', () => {
  it('uses Roadie tokens for the live paint', () => {
    expect(cssPaint.highlight).toBe('var(--chart-highlight)')
    expect(cssPaint.categorical).toHaveLength(8)
    expect(cssPaint.categorical[0]).toBe('var(--chart-1)')
    expect(cssPaint.pair).toEqual([
      'var(--chart-pair-1)',
      'var(--chart-pair-2)'
    ])
    expect(cssPaint.heat[8]).toBe('var(--chart-heat-8)')
    expect(cssPaint.diverging[0]).toBe('var(--chart-diverge-pos-4)')
    expect(cssPaint.diverging[4]).toBe('var(--chart-diverge-0)')
    expect(cssPaint.diverging[8]).toBe('var(--chart-diverge-neg-4)')
    expect(cssPaint.surface).toBe('var(--chart-gap)')
  })

  it('has no raw colour in the live paint', () => {
    const values = JSON.stringify(cssPaint)
    expect(values).not.toMatch(/#[0-9a-f]{3,8}/i)
  })

  it('takes every static colour from chartHex', () => {
    const hex = chartHex('dark', 20)
    const paint = hexPaint('dark', 20)
    expect(paint.highlight).toBe(hex.highlight)
    expect(paint.grid).toBe(hex.chrome.grid)
    expect(paint.surface).toBe(hex.chrome.surface)
    expect(paint.context).toBe(hex.greys.context)
    expect(paint.band).toBe(hex.band.color)
    expect(paint.pair).toEqual([hex.categorical[0], hex.categorical[1]])
  })
})
