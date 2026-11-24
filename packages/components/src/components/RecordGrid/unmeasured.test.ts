import { describe, expect, it } from 'vitest'

import { FIRST_CARDS, fillerRems } from './unmeasured'

const row = { estimateRem: 10, gapRem: 1 }

describe('fillerRems', () => {
  it.each([
    // [records, columns, rem the filler takes]
    [300, 1, 290 * 11 - 1],
    [300, 2, 145 * 11 - 1],
    [300, 4, 72 * 11 - 1],
    // Every row is already in the first cards: it takes no room, and eats its gap.
    [10, 1, -1],
    [FIRST_CARDS, 4, -1],
    // 301 cards over 4 columns is 76 rows, and the first cards fill 3.
    [301, 4, 73 * 11 - 1]
  ])('for %i records at %i columns', (records, columns, rem) => {
    expect(fillerRems(records, row)[columns - 1]).toBe(rem)
  })

  it('has an entry for every column count it can tell apart', () => {
    expect(fillerRems(300, row)).toHaveLength(12)
  })
})
