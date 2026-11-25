import { describe, expect, it } from 'vitest'

import { FIRST_CARDS, fillerRows } from './unmeasured'

describe('fillerRows', () => {
  it.each([
    // [records, columns, grid rows past the first cards]
    [300, 1, 290],
    [300, 2, 145],
    [300, 4, 72],
    // 301 cards over 4 columns is 76 rows, and the first cards fill 3.
    [301, 4, 73],
    // Never none: a span of nothing isn't one.
    [FIRST_CARDS, 4, 1]
  ])('for %i records at %i columns', (records, columns, rows) => {
    expect(fillerRows(records)[columns - 1]).toBe(rows)
  })

  it('has an entry for every column count it can tell apart', () => {
    expect(fillerRows(300)).toHaveLength(12)
  })
})
