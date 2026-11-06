import { describe, expect, it } from 'vitest'

import { type ToolbarSlot, fitToolbar } from './toolbarFit'

// Block type, Bold, Italic, Link | Divider, Table | Undo, Redo
const SLOTS: ToolbarSlot[] = [
  'lead',
  'separator',
  'item',
  'item',
  'item',
  'separator',
  'item',
  'item',
  'separator',
  'undo',
  'redo'
]
const WIDTHS = [100, 1, 30, 30, 30, 1, 30, 30, 1, 30, 30]
const GAP = 4
// Each slot costs its width and a gap; the row's padding less one gap.
const ALL = WIDTHS.reduce((sum, width) => sum + width + GAP, 4)
const MORE = 30

const fit = (available: number) =>
  fitToolbar({
    slots: SLOTS,
    widths: WIDTHS,
    base: 4,
    gap: GAP,
    more: MORE,
    available
  })

describe('fitToolbar', () => {
  it('shows every slot where they fit', () => {
    expect(fit(ALL)).toBe(null)
  })

  it.each<[string, number, number[]]>([
    [
      'drops Redo and the last item for More',
      ALL - 1,
      [0, 1, 2, 3, 4, 5, 6, 8, 9]
    ],
    [
      'drops a group whole, with its separator',
      ALL - 70,
      [0, 1, 2, 3, 4, 8, 9]
    ],
    ['drops items from the end', ALL - 100, [0, 1, 2, 3, 8, 9]],
    ['keeps the lead and Undo however narrow', 0, [0, 8, 9]]
  ])('%s', (_, available, shown) => {
    expect([...fit(available)!]).toEqual(shown)
  })

  it('leaves room for More once anything is hidden', () => {
    const shown = fit(ALL - 1)!
    const used = [...shown].reduce((sum, slot) => sum + WIDTHS[slot]! + GAP, 4)
    expect(used + MORE + GAP).toBeLessThanOrEqual(ALL - 1)
  })
  it('keeps a first slot ahead of the items before it', () => {
    const slots: ToolbarSlot[] = [...SLOTS]
    slots[4] = 'first'
    const shown = fitToolbar({
      slots,
      widths: WIDTHS,
      base: 4,
      gap: GAP,
      more: MORE,
      available: ALL - 100
    })!
    expect([...shown]).toEqual([0, 1, 2, 4, 8, 9])
  })
})
