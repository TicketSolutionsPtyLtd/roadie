import { describe, expect, it } from 'vitest'

import {
  dropIndex,
  menuMoves,
  moveAnnouncement,
  moveItem,
  reorderLabel
} from './order'

describe('moveItem', () => {
  const items = ['a', 'b', 'c', 'd']

  it.each([
    [0, 2, ['b', 'c', 'a', 'd']],
    [3, 0, ['d', 'a', 'b', 'c']],
    [1, 1, ['a', 'b', 'c', 'd']],
    [2, 3, ['a', 'b', 'd', 'c']]
  ])('moves index %i to %i', (from, to, next) => {
    expect(moveItem(items, from, to)).toEqual(next)
  })

  it('leaves the input alone', () => {
    const frozen = Object.freeze([...items])
    moveItem(frozen, 0, 3)
    expect(frozen).toEqual(items)
  })
})

describe('dropIndex', () => {
  it.each([
    // from, target, edge, axis, dir → to
    [0, 2, 'top', 'vertical', 'ltr', 1],
    [0, 2, 'bottom', 'vertical', 'ltr', 2],
    [3, 1, 'top', 'vertical', 'ltr', 1],
    [3, 1, 'bottom', 'vertical', 'ltr', 2],
    [1, 2, 'top', 'vertical', 'ltr', 1],
    [1, 0, 'bottom', 'vertical', 'ltr', 1],
    [0, 2, 'left', 'horizontal', 'ltr', 1],
    [0, 2, 'right', 'horizontal', 'ltr', 2],
    [0, 2, 'right', 'horizontal', 'rtl', 1],
    [0, 2, 'left', 'horizontal', 'rtl', 2]
  ] as const)(
    'drops %i on %i at its %s edge (%s, %s) at %i',
    (from, target, edge, axis, dir, to) => {
      expect(dropIndex({ from, target, edge, axis, dir })).toBe(to)
    }
  )
})

describe('menuMoves', () => {
  it('lists every move in reading order with the ends disabled', () => {
    expect(
      menuMoves({ index: 0, total: 3, axis: 'vertical', dir: 'ltr' })
    ).toEqual([
      { direction: 'up', to: -1, disabled: true },
      { direction: 'down', to: 1, disabled: false },
      { direction: 'top', to: 0, disabled: true },
      { direction: 'bottom', to: 2, disabled: false }
    ])
  })

  it('disables down and bottom on the last item', () => {
    const moves = menuMoves({
      index: 2,
      total: 3,
      axis: 'vertical',
      dir: 'ltr'
    })
    expect(
      moves.filter((move) => move.disabled).map((m) => m.direction)
    ).toEqual(['down', 'bottom'])
  })

  it('names horizontal moves by the side they go to', () => {
    const directions = (dir: 'ltr' | 'rtl') =>
      menuMoves({ index: 1, total: 3, axis: 'horizontal', dir }).map(
        (move) => move.direction
      )
    expect(directions('ltr')).toEqual(['left', 'right', 'start', 'end'])
    expect(directions('rtl')).toEqual(['right', 'left', 'start', 'end'])
  })
})

describe('reorderLabel', () => {
  it.each([
    ['up', 'SKU', 'Move SKU up'],
    ['down', 'SKU', 'Move SKU down'],
    ['top', 'SKU', 'Move SKU to top'],
    ['bottom', 'SKU', 'Move SKU to bottom'],
    ['left', 'SKU', 'Move SKU left'],
    ['start', 'SKU', 'Move SKU to start'],
    ['end', undefined, 'Move to end'],
    ['up', undefined, 'Move up']
  ] as const)('labels %s for %j as %j', (direction, name, label) => {
    expect(reorderLabel(direction, name)).toBe(label)
  })
})

describe('moveAnnouncement', () => {
  it.each([
    ['SKU', 2, 7, 'columns', 'SKU moved to position 3 of 7 columns'],
    ['SKU', 0, 7, undefined, 'SKU moved to position 1 of 7'],
    [undefined, 6, 7, undefined, 'Moved to position 7 of 7']
  ])('says %j at %i of %i in %j', (name, to, total, collection, message) => {
    expect(moveAnnouncement({ name, to, total, collection })).toBe(message)
  })
})
