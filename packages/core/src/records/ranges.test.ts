import { describe, expect, it } from 'vitest'

import { placeRange } from './ranges'

describe('placeRange', () => {
  it('places rows at their index and leaves gaps undefined', () => {
    expect(placeRange([], 2, ['c', 'd'])).toEqual([
      undefined,
      undefined,
      'c',
      'd'
    ])
  })

  it('keeps rows already held and replaces those it overlaps', () => {
    expect(placeRange(['a', 'b', 'c'], 1, ['B'])).toEqual(['a', 'B', 'c'])
  })

  it('returns a copy', () => {
    const data = ['a']
    const next = placeRange(data, 1, ['b'])
    expect(next).not.toBe(data)
    expect(data).toEqual(['a'])
  })

  it('fills holes in a sparse array with undefined', () => {
    // eslint-disable-next-line no-sparse-arrays
    const next = placeRange([, 'b'], 3, ['d'])
    expect(0 in next).toBe(true)
    expect(next).toEqual([undefined, 'b', undefined, 'd'])
  })
})
