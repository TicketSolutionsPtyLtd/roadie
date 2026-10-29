import { describe, expect, it } from 'vitest'

import {
  axisFormat,
  finiteOrNull,
  fullFormat,
  fullValue,
  gridTicks,
  labelFormat,
  valueDomain
} from './values'

describe('value domains', () => {
  it('spans 200,000 values without overflowing the stack', () => {
    const values = Array.from({ length: 200_000 }, (_, i) => i)
    expect(valueDomain(values, { zero: true })).toEqual([0, 200_000])
  })

  it('starts at zero when asked', () => {
    expect(valueDomain([120, 184, 90], { zero: true })[0]).toBe(0)
  })

  it('rounds the top to a readable step', () => {
    expect(valueDomain([0, 1464], { zero: true })).toEqual([0, 1500])
    expect(valueDomain([0, 0.61], { zero: true })).toEqual([0, 0.8])
  })

  it('never returns an empty or invalid domain', () => {
    expect(valueDomain([0, 0], { zero: true })).toEqual([0, 2])
    expect(valueDomain([0, 0], { format: 'percent' })).toEqual([0, 1])
    expect(valueDomain([], { zero: true })).toEqual([0, 1])
    expect(valueDomain([null, Number.NaN], { zero: true })).toEqual([0, 1])
  })

  it('includes negatives', () => {
    const [low, high] = valueDomain([-40, 120], { zero: true })
    expect(low).toBeLessThanOrEqual(-40)
    expect(high).toBeGreaterThanOrEqual(120)
  })

  it('keeps the data maximum when nice rounding is off', () => {
    expect(valueDomain([612, 97, 61], { nice: false })).toEqual([0, 612])
    expect(valueDomain([0, 0.61], { nice: false })).toEqual([0, 0.61])
    expect(valueDomain([-40, 120], { nice: false })).toEqual([-40, 120])
    expect(valueDomain([0, 0], { nice: false })).toEqual([0, 1])
    expect(valueDomain([], { nice: false })).toEqual([0, 1])
  })

  it('rounds by default', () => {
    expect(valueDomain([612, 97, 61])).toEqual([0, 800])
  })

  it('keeps the middle gridline whole on a count axis', () => {
    for (const max of [1, 3, 5, 15, 25, 150]) {
      const domain = valueDomain([0, max], { format: 'number' })
      expect(domain[1]).toBeGreaterThanOrEqual(max)
      expect(Number.isInteger(gridTicks(domain)[1])).toBe(true)
    }
    expect(valueDomain([0, 25], { format: 'number' })).toEqual([0, 30])
  })

  it('leaves shares, money and fractions on the usual steps', () => {
    expect(valueDomain([0, 0.25], { format: 'percent' })).toEqual([0, 0.25])
    expect(valueDomain([0, 25], { format: 'currency' })).toEqual([0, 25])
    expect(valueDomain([0, 2.3], { format: 'number' })).toEqual([0, 2.5])
  })

  it('draws three gridlines', () => {
    expect(gridTicks([0, 1500])).toEqual([0, 750, 1500])
  })

  it('goes compact past 10,000 and keeps full values in tables', () => {
    expect(axisFormat('number', 24_000)(24_000)).toBe('24k')
    expect(axisFormat('number', 9_000)(9_000)).toBe('9,000')
    expect(axisFormat('currency', 120_000)(118_400)).toBe('$118.4k')
    expect(fullFormat('compact')).toBe('number')
    expect(fullFormat('compactCurrency')).toBe('currency')
    expect(fullFormat(undefined)).toBe('number')
  })

  it('ticks whole money without cents', () => {
    expect(axisFormat('currency', 5_000)(2_500)).toBe('$2,500')
    expect(axisFormat('currency', 5_000)(1_557.5)).toBe('$1,557.50')
  })

  it('labels a value on the plot compactly past 10,000', () => {
    expect(labelFormat({ format: 'number' }, 24_000)).toBe('24k')
    expect(labelFormat({ format: 'number' }, 9_000)).toBe('9,000')
    expect(labelFormat({}, 1_464)).toBe('1,464')
    expect(labelFormat({ format: 'currency' }, 118_400)).toBe('$118.4k')
    expect(labelFormat({ format: 'currency' }, -118_400)).toBe('-$118.4k')
    expect(labelFormat({ format: 'percent' }, 0.68)).toBe('68%')
  })

  it('labels a value to its decimal places until it goes compact', () => {
    expect(labelFormat({ format: 'currency' }, 634)).toBe('$634.00')
    expect(labelFormat({ format: 'currency', trimZeros: true }, 634)).toBe(
      '$634'
    )
    expect(labelFormat({ format: 'percent', decimals: 2 }, 0.0127)).toBe(
      '1.27%'
    )
    expect(labelFormat({ format: 'number', decimals: 2 }, 24_000)).toBe('24k')
  })

  it('reads a value in full to its decimal places', () => {
    expect(fullValue({ format: 'percent', decimals: 2 }, 0.1266)).toBe('12.66%')
    expect(fullValue({ format: 'compactCurrency' }, 118_400)).toBe(
      '$118,400.00'
    )
    expect(
      fullValue({ format: 'compactCurrency', trimZeros: true }, 118_400)
    ).toBe('$118,400')
    expect(fullValue({}, 1_842.5)).toBe('1,842.5')
  })

  it('reads only finite numbers', () => {
    expect(finiteOrNull(42)).toBe(42)
    expect(finiteOrNull(0)).toBe(0)
    expect(finiteOrNull(Number.NaN)).toBeNull()
    expect(finiteOrNull(Number.POSITIVE_INFINITY)).toBeNull()
    expect(finiteOrNull('42')).toBeNull()
    expect(finiteOrNull(null)).toBeNull()
    expect(finiteOrNull(undefined)).toBeNull()
  })
})
