import { describe, expect, it } from 'vitest'

import {
  type PaneEntry,
  derivePositions,
  deriveRootIndex,
  deriveTopIndex,
  orderByDocumentPosition,
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
  it('puts the list on top when nothing deeper is current', () => {
    expect(
      deriveTopIndex([entry({ role: 'list' }), entry({ role: 'detail' })])
    ).toBe(0)
  })

  it('puts the deepest current pane on top', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(1)
  })

  it('ignores an inspector — it overlays rather than joining the stack', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true }),
        entry({ role: 'inspector', current: true })
      ])
    ).toBe(1)
  })

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

  it('still finds the deepest current pane past a leading inspector', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'inspector' }),
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(2)
  })

  it('returns 0 for an empty stack rather than -1', () => {
    expect(deriveTopIndex([])).toBe(0)
  })
})

describe('deriveRootIndex', () => {
  it('is the first pane, regardless of which one is current', () => {
    expect(
      deriveRootIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(0)
  })

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

describe('orderByDocumentPosition', () => {
  const appendNode = (tagName = 'div') => {
    const node = document.createElement(tagName)
    document.body.append(node)
    return node
  }

  it('sorts registrations into document order regardless of input order', () => {
    const first = appendNode()
    const second = appendNode()
    const third = appendNode()

    const ordered = orderByDocumentPosition([
      { node: third, label: 'third' },
      { node: first, label: 'first' },
      { node: second, label: 'second' }
    ])

    expect(ordered.map((entry) => entry.label)).toEqual([
      'first',
      'second',
      'third'
    ])
  })
})

describe('derivePositions', () => {
  it('marks the top pane and splits the rest into behind/ahead', () => {
    expect(
      derivePositions([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true }),
        entry({ role: 'detail' })
      ])
    ).toEqual(['behind', 'top', 'ahead'])
  })

  it('leaves an inspector out of the stack entirely', () => {
    expect(
      derivePositions([
        entry({ role: 'inspector' }),
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true })
      ])
    ).toEqual([null, 'behind', 'top'])
  })

  it('puts the list on top when nothing else is current', () => {
    expect(
      derivePositions([entry({ role: 'list' }), entry({ role: 'detail' })])
    ).toEqual(['top', 'ahead'])
  })
})

describe('revealRoot', () => {
  const list = { role: 'list', current: false, primaryNav: 'auto' } as const
  const detail = { role: 'detail', current: true, primaryNav: 'auto' } as const
  const inspector = {
    role: 'inspector',
    current: false,
    primaryNav: 'auto'
  } as const

  it('makes the root the top and everything after it ahead', () => {
    expect(derivePositions([list, detail], true)).toEqual(['top', 'ahead'])
  })

  it('skips a leading inspector', () => {
    expect(derivePositions([inspector, list, detail], true)).toEqual([
      null,
      'top',
      'ahead'
    ])
  })

  it('changes nothing when off', () => {
    expect(derivePositions([list, detail])).toEqual(['behind', 'top'])
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

  it('treats a SecondaryPane override as the root', () => {
    expect(provisionalPosition({ ...section, kind: 'section' }, true)).toBe(
      'top'
    )
  })

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
  const pane = (role: 'list' | 'detail' | 'inspector', depth?: 0 | 1 | 2 | 3) =>
    ({ role, kind: 'pane', depth }) as const

  it('takes the declaration, else the role default', () => {
    expect(provisionalDepth(pane('list'))).toBe(0)
    expect(provisionalDepth(pane('detail'))).toBe(1)
    expect(provisionalDepth(pane('detail', 2))).toBe(2)
    expect(provisionalDepth(pane('inspector'))).toBeNull()
  })

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

  it('makes a lone detail the root', () => {
    expect(resolveDepths([{ role: 'detail', kind: 'pane' }])).toEqual([0])
  })

  it('keeps More at the root wherever it renders', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane' },
        { role: 'list', kind: 'generated-overflow' }
      ])
    ).toEqual([0, 1, 0])
  })

  it('separates panes that share a depth by document order', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane' },
        { role: 'detail', kind: 'pane' },
        { role: 'detail', kind: 'pane' }
      ])
    ).toEqual([0, 1, 2, 3])
  })

  it('lets a declared depth outrank document order', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane', depth: 2 },
        { role: 'detail', kind: 'pane' }
      ])
    ).toEqual([0, 2, 1])
  })

  it('closes the gap under a declared depth', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane', depth: 2 }
      ])
    ).toEqual([0, 1])
  })

  it('makes open More the root beside the detail, and closed More nothing', () => {
    const detail = { role: 'detail', kind: 'pane' } as const
    const more = { role: 'list', kind: 'generated-overflow' } as const
    expect(resolveDepths([detail, { ...more, current: true }])).toEqual([1, 0])
    expect(resolveDepths([detail, { ...more, current: false }])).toEqual([0, 0])
  })

  it('never lets open More displace a list', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane' },
        { role: 'list', kind: 'generated-overflow', current: true }
      ])
    ).toEqual([0, 1, 0])
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
