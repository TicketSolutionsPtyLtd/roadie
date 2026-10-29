import { describe, expect, it } from 'vitest'

import { correctsRowsAbove } from './rowWindow'

const at = (start: number, size: number) => ({
  key: 'row',
  start,
  end: start + size
})
const scrolledTo = (scrollOffset: number, measured: boolean) => ({
  scrollOffset,
  itemSizeCache: new Map(measured ? [['row', 100]] : [])
})

describe('correctsRowsAbove', () => {
  it('corrects a row wholly above the scroll offset', () => {
    expect(correctsRowsAbove(at(0, 100), 20, scrolledTo(500, true))).toBe(true)
  })

  it('corrects a row across the top edge on its first measurement', () => {
    expect(correctsRowsAbove(at(450, 100), 20, scrolledTo(500, false))).toBe(
      true
    )
  })

  it('leaves a measured row across the top edge to grow downward', () => {
    expect(correctsRowsAbove(at(450, 100), 20, scrolledTo(500, true))).toBe(
      false
    )
  })

  it('leaves a row at or below the scroll offset', () => {
    expect(correctsRowsAbove(at(500, 100), 20, scrolledTo(500, false))).toBe(
      false
    )
  })
})
