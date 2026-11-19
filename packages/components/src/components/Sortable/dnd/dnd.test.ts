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
    expect(drop).toMatchObject({ source: { value: 'Date' }, target: 'SKU' })
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

  it('takes a drop from another list in a shared group', () => {
    const todo = createSortableGroup('lanes', 'todo')
    const done = createSortableGroup('lanes', 'done')
    const drop = sortableDropFrom(
      [target(sortableItemData(done, 'SKU'))],
      { data: sortableItemData(todo, 'Date', 'Date') },
      done
    )
    expect(drop).toMatchObject({
      source: { value: 'Date', list: 'todo', sameList: false },
      target: 'SKU'
    })
    // The list it came from leaves the drop to the list it landed in.
    expect(
      sortableDropFrom(
        [target(sortableItemData(done, 'SKU'))],
        { data: sortableItemData(todo, 'Date') },
        todo
      )
    ).toBe(null)
  })

  it('marks an item its list has locked', () => {
    const locked = new Set(['Date'])
    const todo = createSortableGroup('lanes', 'todo', { locked })
    const done = createSortableGroup('lanes', 'done')
    const drop = sortableDropFrom(
      [target(sortableItemData(done, 'SKU'))],
      { data: sortableItemData(todo, 'Date') },
      done
    )
    expect(drop?.source.locked).toBe(true)
  })

  it('finds nothing when no target is in the group', () => {
    expect(sortableDropFrom([target({ other: true })], source, group)).toBe(
      null
    )
  })
})
