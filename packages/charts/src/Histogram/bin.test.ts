import { describe, expect, it } from 'vitest'

import { MAX_BINS, binValues, histogramValues, medianOf } from './bin'

describe('binValues', () => {
  it('bins by width from a round start', () => {
    const bins = binValues([0, 3, 6, 7, 13, 14], { binWidth: 7 })
    expect(bins.map((b) => [b.from, b.to, b.count])).toEqual([
      [0, 7, 3],
      [7, 14, 2],
      [14, 21, 1]
    ])
  })

  it('bins by count across the range on round edges', () => {
    const bins = binValues([0, 10, 20, 30, 40], { bins: 4 })
    expect(bins.map((b) => b.from)).toEqual([0, 10, 20, 30])
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(5)
  })

  it('closes the last bin on a maximum at the top edge, not a stub bin', () => {
    const whole = binValues(
      Array.from({ length: 41 }, (_, i) => i),
      { bins: 4 }
    )
    expect(whole.map((b) => [b.from, b.to, b.count])).toEqual([
      [0, 10, 10],
      [10, 20, 10],
      [20, 30, 10],
      [30, 41, 11]
    ])
    const spread = binValues([0, 1.5, 3.2, 5.5, 7.1, 10], { bins: 5 })
    expect(spread.map((b) => [b.from, b.to, b.count])).toEqual([
      [0, 2, 2],
      [2, 4, 1],
      [4, 6, 1],
      [6, 8, 1],
      [8, 10, 1]
    ])
  })

  it('keeps a stub bin when the width is given', () => {
    expect(binValues([0, 7, 14], { binWidth: 7 })).toHaveLength(3)
  })

  it('rounds edges to nice numbers in bins mode', () => {
    const values = [0.3, 1.1, 2.9, 4.4, 6.2, 7.7, 9.1, 10.4, 12.3, 13.9]
    const bins = binValues(values, { bins: 6 })
    expect(bins.map((b) => b.from)).toEqual([0, 2.5, 5, 7.5, 10, 12.5])
  })

  it('gives whole numbers whole edges', () => {
    const bins = binValues([1, 2, 2, 3, 4, 7], { bins: 3 })
    expect(bins.every((b) => Number.isInteger(b.from) && b.whole)).toBe(true)
    expect(binValues([1, 2, 3], { binWidth: 0.5 })[0]).toMatchObject({
      from: 1,
      to: 2
    })
  })

  it('caps the bin count however small the width', () => {
    const bins = binValues([0, 1_000_000], { binWidth: 1 })
    expect(bins.length).toBeLessThanOrEqual(MAX_BINS)
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(2)
  })

  it('picks a sensible bin count by default', () => {
    const values = Array.from({ length: 500 }, (_, i) => i)
    const count = binValues(values, {}).length
    expect(count).toBeGreaterThanOrEqual(5)
    expect(count).toBeLessThanOrEqual(20)
  })

  it('keeps every value, including the maximum', () => {
    expect(
      binValues([1, 2, 3, 4, 5], { bins: 2 }).reduce((s, b) => s + b.count, 0)
    ).toBe(5)
  })

  it('gives one bin when every value is the same', () => {
    expect(binValues([4, 4, 4], {})).toEqual([
      expect.objectContaining({ count: 3 })
    ])
  })

  it('gives no bins for no values', () => {
    expect(binValues([], { binWidth: 7 })).toEqual([])
  })

  it('numbers the bins in order', () => {
    expect(
      binValues([0, 3, 6, 7, 13, 14], { binWidth: 7 }).map((b) => b.index)
    ).toEqual([0, 1, 2])
  })
})

describe('histogramValues', () => {
  it('keeps only finite numbers', () => {
    expect(
      histogramValues({
        data: [{ d: 1 }, { d: null }, { d: 'x' }, { d: Infinity }, { d: 4 }],
        x: 'd'
      })
    ).toEqual([1, 4])
  })
})

describe('medianOf', () => {
  it('finds the middle value', () => {
    expect(medianOf([5, 1, 3])).toBe(3)
    expect(medianOf([1, 2, 3, 4])).toBe(2.5)
    expect(medianOf([])).toBeNull()
  })
})
