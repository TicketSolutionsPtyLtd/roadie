import { describe, expect, it } from 'vitest'

import type { RecordSelection } from '@oztix/roadie-core/records'

import {
  EMPTY_SELECTION,
  deselect,
  isSelected,
  pageState,
  reconcileSelection,
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

describe('reconcileSelection', () => {
  const picked = { ids: ['a', 'x'] }
  const all = { allMatching: true, except: [] } as const
  const inputs = {
    held: picked,
    picked: null,
    key: 'Ocean',
    applied: true,
    server: false,
    matching: order
  }
  const taken = (key: string, held: RecordSelection = picked) => ({
    held,
    key,
    selection: held
  })

  it.each([
    {
      name: 'keeps a selection taken against the query shown',
      taken: taken('Ocean', { ids: ['a', 'x'] }),
      inputs: {},
      selection: picked
    },
    {
      name: 'keeps every pick while a new search waits to apply',
      taken: taken(''),
      inputs: { applied: false },
      selection: picked
    },
    {
      name: 'drops picked ids a new search hides once it applies',
      taken: taken(''),
      inputs: {},
      selection: { ids: ['a'] }
    },
    {
      name: 'drops all matching once a new search applies',
      taken: taken('', all),
      inputs: { held: all },
      selection: EMPTY_SELECTION
    },
    {
      name: 'drops picked ids on a server, which alone knows the matches',
      taken: taken(''),
      inputs: { server: true },
      selection: EMPTY_SELECTION
    }
  ])('$name', ({ taken, inputs: changed, selection }) => {
    expect(
      reconcileSelection(taken, { ...inputs, ...changed }).selection
    ).toEqual(selection)
  })

  it('keeps holding what it took while nothing changes', () => {
    const held = reconcileSelection(taken(''), inputs).taken
    const again = reconcileSelection(held, inputs)
    expect(again.taken).toBe(held)
    expect(again.selection).toEqual({ ids: ['a'] })
    expect(again.pickRead).toBe(false)
  })

  it('leaves an empty selection as it is, so a server search tells the parent nothing', () => {
    const none = { ids: [] }
    const { selection } = reconcileSelection(taken('', none), {
      ...inputs,
      held: none,
      server: true
    })
    expect(selection).toBe(none)
  })

  it.each([
    {
      name: 'a pick made here belongs to the query it was made against, even while a search lags',
      picked: { selection: { ids: ['a', 'x'] }, key: '' },
      key: '',
      pickRead: true
    },
    {
      name: 'an outside selection belongs to the query as set',
      picked: null,
      key: 'Ocean',
      pickRead: false
    },
    {
      name: 'an outside selection that differs from the last pick is outside',
      picked: { selection: { ids: ['b'] }, key: '' },
      key: 'Ocean',
      pickRead: true
    }
  ])('$name', ({ picked: pick, key, pickRead }) => {
    const before = taken('', { ids: ['c'] })
    expect(
      reconcileSelection(before, { ...inputs, picked: pick, applied: false })
    ).toEqual({ selection: picked, taken: taken(key), pickRead })
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
