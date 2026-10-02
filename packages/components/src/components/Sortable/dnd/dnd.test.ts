import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { describe, expect, it } from 'vitest'

import { createSortableGroup, sortableDropFrom, sortableItemData } from '.'

const input = {
  altKey: false,
  button: 0,
  buttons: 1,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  clientX: 0,
  clientY: 0,
  pageX: 0,
  pageY: 0
}

const target = (data: Record<string | symbol, unknown>) => ({
  data: attachClosestEdge(data, {
    input,
    element: document.createElement('div'),
    allowedEdges: ['top', 'bottom']
  })
})

describe('sortableDropFrom', () => {
  const group = createSortableGroup()
  const source = { data: sortableItemData(group, 'Date') }

  it('skips a nested target that belongs to something else', () => {
    const drop = sortableDropFrom(
      [target({ other: true }), target(sortableItemData(group, 'SKU'))],
      source,
      group
    )
    expect(drop).toMatchObject({ value: 'Date', target: 'SKU' })
  })

  it('skips an inner Sortable for the one the drag belongs to', () => {
    const inner = createSortableGroup()
    const drop = sortableDropFrom(
      [
        target(sortableItemData(inner, 'Nested')),
        target(sortableItemData(group, 'Price'))
      ],
      source,
      group
    )
    expect(drop).toMatchObject({ target: 'Price' })
  })

  it('finds nothing when no target is in the group', () => {
    expect(sortableDropFrom([target({ other: true })], source, group)).toBe(
      null
    )
  })
})
