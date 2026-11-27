import { describe, expect, it } from 'vitest'

import { dotWindow } from './dotWindow'

describe('dotWindow', () => {
  it.each([
    // count, selected, max, start, size
    [20, 0, undefined, 0, 20],
    [20, 0, 7, 0, 7],
    [20, 3, 7, 0, 7],
    [20, 6, 7, 3, 7],
    [20, 19, 7, 13, 7],
    [20, 17, 7, 13, 7],
    [5, 4, 7, 0, 5],
    [20, 10, 6, 7, 6],
    [20, 10, 1, 10, 1],
    [20, 10, 7.9, 7, 7],
    [20, 10, 0, 0, 20],
    [20, 10, -3, 0, 20],
    [20, 10, Number.NaN, 0, 20],
    [20, 10, Number.POSITIVE_INFINITY, 0, 20]
  ])(
    '%i slides, slide %i current, max %s: starts at %i and draws %i',
    (count, selected, max, start, size) => {
      expect(dotWindow(count, selected, max)).toEqual({ start, size })
    }
  )
})
