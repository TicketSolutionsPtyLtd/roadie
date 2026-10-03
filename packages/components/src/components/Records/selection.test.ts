import { describe, expect, it } from 'vitest'

import {
  EMPTY_SELECTION,
  deselect,
  isSelected,
  pageState,
  sameSelection,
  selectPage,
  selectedCount,
  toggle,
  toggleRange,
  withinMatching
} from './selection'

const order = ['a', 'b', 'c', 'd', 'e']

describe('selection', () => {
  it('toggles ids on and off', () => {
    const one = toggle(EMPTY_SELECTION, 'b')
    expect(isSelected(one, 'b')).toBe(true)
    expect(isSelected(toggle(one, 'b'), 'b')).toBe(false)
    expect(isSelected(toggle(one, 'b', true), 'b')).toBe(true)
  })

  it('selects a range in visible order from the anchor', () => {
    const range = toggleRange(
      toggle(EMPTY_SELECTION, 'b'),
      order,
      'b',
      'd',
      true
    )
    expect(order.filter((id) => isSelected(range, id))).toEqual(['b', 'c', 'd'])
  })

  it('treats a range with a missing anchor as a single toggle', () => {
    const range = toggleRange(EMPTY_SELECTION, order, 'gone', 'd', true)
    expect(order.filter((id) => isSelected(range, id))).toEqual(['d'])
  })

  it('selects all matching except the rows unticked after', () => {
    const all = { allMatching: true, except: [] } as const
    const some = toggle(all, 'c')
    expect(isSelected(some, 'c')).toBe(false)
    expect(isSelected(some, 'a')).toBe(true)
    expect(selectedCount(some, order)).toBe(4)
  })

  it('counts only ids that still match', () => {
    const picked = { ids: ['a', 'x'] }
    expect(selectedCount(picked, order)).toBe(1)
  })

  it('selects and clears a page and reports a mixed state', () => {
    const page = ['a', 'b', 'c']
    expect(pageState(EMPTY_SELECTION, page)).toBe(false)
    const one = toggle(EMPTY_SELECTION, 'a')
    expect(pageState(one, page)).toBe('mixed')
    const all = selectPage(one, page, true)
    expect(pageState(all, page)).toBe(true)
    expect(pageState(selectPage(all, page, false), page)).toBe(false)
  })

  it('narrows picked ids to the matching rows', () => {
    const picked = { ids: ['a', 'x', 'c'] }
    expect(withinMatching(picked, order)).toEqual({ ids: ['a', 'c'] })
    const kept = { ids: ['a'] }
    expect(withinMatching(kept, order)).toBe(kept)
  })

  it('deselects only the given ids', () => {
    expect(deselect({ ids: ['a', 'b', 'c'] }, ['a', 'c'])).toEqual({
      ids: ['b']
    })
  })
})

describe('sameSelection', () => {
  it('compares by kind and ids, not identity', () => {
    expect(sameSelection({ ids: ['a'] }, { ids: ['a'] })).toBe(true)
    expect(sameSelection({ ids: ['a'] }, { ids: ['b'] })).toBe(false)
    expect(sameSelection({ allMatching: true, except: [] }, { ids: [] })).toBe(
      false
    )
    expect(
      sameSelection(
        { allMatching: true, except: ['a'] },
        { allMatching: true, except: ['a'] }
      )
    ).toBe(true)
  })
})
