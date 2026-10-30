import { describe, expect, it } from 'vitest'

import { sameData } from './sameData'

describe('sameData', () => {
  it.each<[unknown, unknown, boolean]>([
    [[{ field: 'a', values: ['x'] }], [{ field: 'a', values: ['x'] }], true],
    [{ value: NaN }, { value: NaN }, true],
    [{ value: NaN }, { value: null }, false],
    [new Date(0), new Date(0), true],
    [new Date(0), new Date(0).toJSON(), false],
    [{ a: undefined }, { b: undefined }, false],
    [[1, 2], { 0: 1, 1: 2 }, false],
    [{ a: [1] }, { a: [1, 2] }, false]
  ])('compares %j with %j as %s', (a, b, same) => {
    expect(sameData(a, b)).toBe(same)
  })
})
