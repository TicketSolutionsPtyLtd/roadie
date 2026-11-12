import { describe, expect, it } from 'vitest'

import { classStarts, levelOf, rangesOf } from './steps'

describe('rangesOf', () => {
  it('gives each colour’s range, strongest first, up to its own largest value', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 400]
    expect(
      rangesOf([1, 3, 5, 7, 9], values, String).map((r) => r.range)
    ).toEqual(['9 to 400', '7 to 8', '5 to 6', '3 to 4', '1 to 2'])
  })

  it('writes a range of one value as that value, and leaves out a colour with none', () => {
    expect(
      rangesOf([12, 12, 30, 30, 30], [12, 30], (value) => `$${value}`)
    ).toEqual([
      { level: 4, range: '$30' },
      { level: 1, range: '$12' }
    ])
  })
})

describe('classStarts and levelOf', () => {
  it('puts a fifth of the values in each step, however skewed', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 400]
    const starts = classStarts(values)

    expect(starts).toEqual([1, 3, 5, 7, 9])
    expect(values.map((value) => levelOf(value, starts))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4
    ])
  })

  it('has no steps without values', () => {
    expect(classStarts([])).toEqual([])
  })
})
