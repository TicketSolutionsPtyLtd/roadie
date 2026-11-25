import { describe, expect, it } from 'vitest'

import { type Fiber, countCommit } from './renderCounter'

const PERFORMED_WORK = 1

function Parent() {}
function Row() {}

const fiber = (
  type: unknown,
  flags = 0,
  child: Fiber | null = null
): Fiber => ({
  child,
  sibling: null,
  alternate: null,
  flags,
  type
})

/** A commit where Parent re-rendered over a Row that last rendered in an earlier commit. */
function commit({ rowRerendered }: { rowRerendered: boolean }) {
  const oldRow = fiber(Row, PERFORMED_WORK)
  oldRow.alternate = fiber(Row)
  const oldParent = fiber(Parent, 0, oldRow)
  // A bail-out keeps the old child list; a re-render clones it.
  const row = rowRerendered ? fiber(Row, PERFORMED_WORK) : oldRow
  if (rowRerendered) row.alternate = oldRow
  const parent = fiber(Parent, PERFORMED_WORK, row)
  parent.alternate = oldParent
  return parent
}

describe('countCommit', () => {
  it.each([
    [{ rowRerendered: true }, { Parent: 1, Row: 1 }],
    [{ rowRerendered: false }, { Parent: 1 }]
  ])('counts what a commit re-rendered, as in %j', (shape, counts) => {
    const counting: Record<string, number> = {}
    countCommit(commit(shape), counting)
    expect(counting).toEqual(counts)
  })

  it('counts nothing for a component that only mounted', () => {
    const counting: Record<string, number> = {}
    countCommit(
      fiber(Parent, PERFORMED_WORK, fiber(Row, PERFORMED_WORK)),
      counting
    )
    expect(counting).toEqual({})
  })
})
