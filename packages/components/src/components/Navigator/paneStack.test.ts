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
  role: 'detail',
  current: false,
  primaryNav: 'auto',
  ...over
})

describe('deriveTopIndex', () => {
  it('takes the deepest of several current panes', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list', current: true }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(1)
  })

  it('skips a leading inspector rather than stranding the top on it', () => {
    expect(
      deriveTopIndex([entry({ role: 'inspector' }), entry({ role: 'list' })])
    ).toBe(1)
  })

  it('returns 0 for an empty stack rather than -1', () => {
    expect(deriveTopIndex([])).toBe(0)
  })
})

describe('deriveRootIndex', () => {
  it('skips a leading inspector — it never joins the stack', () => {
    expect(
      deriveRootIndex([entry({ role: 'inspector' }), entry({ role: 'list' })])
    ).toBe(1)
  })

  it('returns -1 when every entry is an inspector', () => {
    expect(deriveRootIndex([entry({ role: 'inspector' })])).toBe(-1)
  })

  // Root-ness is stack depth, not the `list` role — a `detail → detail →
  // detail` arrangement (list → detail → detail with a screen removed) still
  // has exactly one root. A `role === 'list'` shortcut would return -1 here.
  it('finds the root when no entry is role="list"', () => {
    expect(
      deriveRootIndex([
        entry({ role: 'detail', current: true }),
        entry({ role: 'detail' }),
        entry({ role: 'detail' })
      ])
    ).toBe(0)
  })
})

describe('derivePositions', () => {
  it('orders by rank, document order only between equals', () => {
    const stack = [
      entry({ role: 'list', rank: 0 }),
      entry({ current: true, rank: 2 }),
      entry({ current: true, rank: 1 }),
      entry({ rank: 3 })
    ]
    expect(deriveTopIndex(stack)).toBe(1)
    expect(derivePositions(stack)).toEqual(['behind', 'top', 'behind', 'ahead'])
    expect(deriveRootIndex([entry({ rank: 1 }), entry({ rank: 0 })])).toBe(1)
    expect(
      derivePositions([entry({ current: true, rank: 1 }), entry({ rank: 1 })])
    ).toEqual(['top', 'ahead'])
  })
})

describe('provisionalPosition', () => {
  const section = {
    role: 'list',
    current: false,
    primaryNav: 'auto',
    kind: 'generated-section'
  } as const
  const detail = {
    role: 'detail',
    current: true,
    primaryNav: 'auto',
    kind: 'pane'
  } as const
  const inspector = { ...detail, role: 'inspector', current: false } as const
  const stack = [section, detail, inspector]

  it.each([true, false])(
    'agrees with derivePositions once registered (revealed: %s)',
    (revealRoot) => {
      expect(
        stack.map((pane) => provisionalPosition(pane, revealRoot))
      ).toEqual(derivePositions(stack, revealRoot))
    }
  )

  it('parks More ahead until it opens', () => {
    const more = { ...section, kind: 'generated-overflow' } as const
    expect(provisionalPosition(more, false)).toBe('ahead')
    expect(provisionalPosition({ ...more, current: true }, false)).toBe('top')
  })

  it('leaves a pane whose place depends on DOM order unplaced', () => {
    expect(
      provisionalPosition({ ...detail, role: 'list', current: false }, false)
    ).toBeNull()
  })
})

describe('provisionalDepth', () => {
  it('keeps the generated panes at the root', () => {
    expect(provisionalDepth({ role: 'list', kind: 'generated-section' })).toBe(
      0
    )
    expect(provisionalDepth({ role: 'list', kind: 'section' })).toBe(0)
    expect(
      provisionalDepth({ role: 'list', kind: 'generated-overflow', depth: 2 })
    ).toBe(0)
  })
})

describe('resolveDepths', () => {
  it('counts stack panes up in document order, whatever they declared', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'generated-section' },
        { role: 'detail', kind: 'pane', depth: 1 },
        { role: 'inspector', kind: 'pane' },
        { role: 'detail', kind: 'pane', depth: 1 }
      ])
    ).toEqual([0, 1, null, 2])
  })

  it('closes the gap under a declared depth', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane', depth: 2 }
      ])
    ).toEqual([0, 1])
  })

  it('gives every root list one depth, so a handover pushes nothing deeper', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'generated-section' },
        { role: 'list', kind: 'section' },
        { role: 'detail', kind: 'pane' },
        { role: 'list', kind: 'overflow', current: true }
      ])
    ).toEqual([0, 0, 1, 0])
  })
})
