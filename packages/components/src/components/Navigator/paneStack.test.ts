import { describe, expect, it } from 'vitest'

import {
  type PaneEntry,
  derivePositions,
  deriveRootIndex,
  deriveTopIndex,
  provisionalDepth,
  provisionalPosition,
  resolveDepths
} from './paneStack'

const entry = (over: Partial<PaneEntry> = {}): PaneEntry => ({
  column: 'detail',
  reached: false,
  tabBar: 'auto',
  ...over
})

describe('deriveTopIndex', () => {
  it('takes the deepest of several reached panes', () => {
    expect(
      deriveTopIndex([
        entry({ column: 'list', reached: true }),
        entry({ column: 'detail', reached: true })
      ])
    ).toBe(1)
  })

  it('skips a leading inspector rather than stranding the top on it', () => {
    expect(
      deriveTopIndex([
        entry({ column: 'inspector' }),
        entry({ column: 'list' })
      ])
    ).toBe(1)
  })

  it('returns 0 for an empty stack rather than -1', () => {
    expect(deriveTopIndex([])).toBe(0)
  })
})

describe('deriveRootIndex', () => {
  it('skips a leading inspector — it never joins the stack', () => {
    expect(
      deriveRootIndex([
        entry({ column: 'inspector' }),
        entry({ column: 'list' })
      ])
    ).toBe(1)
  })

  it('returns -1 when every entry is an inspector', () => {
    expect(deriveRootIndex([entry({ column: 'inspector' })])).toBe(-1)
  })

  it('finds the root when no entry is column="list"', () => {
    expect(
      deriveRootIndex([
        entry({ column: 'detail', reached: true }),
        entry({ column: 'detail' }),
        entry({ column: 'detail' })
      ])
    ).toBe(0)
  })
})

describe('derivePositions', () => {
  it('orders by rank, document order only between equals', () => {
    const stack = [
      entry({ column: 'list', rank: 0 }),
      entry({ reached: true, rank: 2 }),
      entry({ reached: true, rank: 1 }),
      entry({ rank: 3 })
    ]
    expect(deriveTopIndex(stack)).toBe(1)
    expect(derivePositions(stack)).toEqual(['behind', 'top', 'behind', 'ahead'])
    expect(deriveRootIndex([entry({ rank: 1 }), entry({ rank: 0 })])).toBe(1)
    expect(
      derivePositions([entry({ reached: true, rank: 1 }), entry({ rank: 1 })])
    ).toEqual(['top', 'ahead'])
  })
})

describe('provisionalPosition', () => {
  const secondary = {
    column: 'list',
    reached: false,
    tabBar: 'auto',
    kind: 'generated-secondary'
  } as const
  const detail = {
    column: 'detail',
    reached: true,
    tabBar: 'auto',
    kind: 'pane'
  } as const
  const inspector = { ...detail, column: 'inspector', reached: false } as const
  const stack = [secondary, detail, inspector]

  it.each([true, false])(
    'agrees with derivePositions once registered (revealed: %s)',
    (revealRoot) => {
      expect(
        stack.map((pane) => provisionalPosition(pane, revealRoot))
      ).toEqual(derivePositions(stack, revealRoot))
    }
  )

  it('parks More ahead until it opens', () => {
    const more = { ...secondary, kind: 'generated-overflow' } as const
    expect(provisionalPosition(more, false)).toBe('ahead')
    expect(provisionalPosition({ ...more, reached: true }, false)).toBe('top')
  })

  it('leaves a pane whose place depends on DOM order unplaced', () => {
    expect(
      provisionalPosition({ ...detail, column: 'list', reached: false }, false)
    ).toBeNull()
  })
})

describe('provisionalDepth', () => {
  it('keeps the generated panes at the root', () => {
    expect(
      provisionalDepth({ column: 'list', kind: 'generated-secondary' })
    ).toBe(0)
    expect(provisionalDepth({ column: 'list', kind: 'secondary' })).toBe(0)
    expect(
      provisionalDepth({ column: 'list', kind: 'generated-overflow', depth: 2 })
    ).toBe(0)
  })
})

describe('resolveDepths', () => {
  it('counts stack panes up in document order, whatever they declared', () => {
    expect(
      resolveDepths([
        { column: 'list', kind: 'generated-secondary' },
        { column: 'detail', kind: 'pane', depth: 1 },
        { column: 'inspector', kind: 'pane' },
        { column: 'detail', kind: 'pane', depth: 1 }
      ])
    ).toEqual([0, 1, null, 2])
  })

  it('closes the gap under a declared depth', () => {
    expect(
      resolveDepths([
        { column: 'list', kind: 'pane' },
        { column: 'detail', kind: 'pane', depth: 2 }
      ])
    ).toEqual([0, 1])
  })

  it('gives every root list one depth, so a handover pushes nothing deeper', () => {
    expect(
      resolveDepths([
        { column: 'list', kind: 'generated-secondary' },
        { column: 'list', kind: 'secondary' },
        { column: 'detail', kind: 'pane' },
        { column: 'list', kind: 'overflow', reached: true }
      ])
    ).toEqual([0, 0, 1, 0])
  })
})
