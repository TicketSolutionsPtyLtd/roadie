import { describe, expect, it } from 'vitest'

import type { PaneRegistration } from '../Pane/PaneStackContext'
import {
  type DrawnPanes,
  type PaneEntry,
  type PlacedPane,
  type RenderClaims,
  claimRenderedDepth,
  derivePositions,
  deriveRootIndex,
  deriveTopIndex,
  paneModel,
  placePane,
  provisionalDepth,
  provisionalPosition,
  resolveDepths,
  servedClaims
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
  it('skips a leading inspector, which never joins the stack', () => {
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

const closed: DrawnPanes = {
  rootList: false,
  rootListDrawn: false,
  secondaryPane: false,
  overflow: false,
  moreOpen: false
}
const pane = (id: string, over: Partial<PaneRegistration> = {}) =>
  ({
    id,
    column: 'detail',
    reached: false,
    tabBar: 'auto',
    kind: 'pane',
    ...over
  }) satisfies PlacedPane
const list = pane('list', { column: 'list' })

const serve = (
  claims: RenderClaims,
  panes: readonly PlacedPane[],
  draws = closed
) => panes.map((served) => claimRenderedDepth(claims, served, draws))

describe('claimRenderedDepth', () => {
  it.each([
    { name: 'a list then a detail', panes: [list, pane('a')], want: [0, 1] },
    {
      name: 'a row of details, from 1 so More can take 0',
      panes: [pane('a'), pane('b')],
      want: [1, 2]
    },
    {
      name: 'a row behind a secondary list still to draw',
      panes: [list, pane('a')],
      draws: { ...closed, rootList: true },
      want: [1, 2]
    },
    {
      name: 'a declared depth',
      panes: [list, pane('a', { depth: 3 })],
      want: [0, 3]
    }
  ])('serves $name at its render-order depth', ({ panes, draws, want }) => {
    const claims: RenderClaims = new Map()
    expect(serve(claims, panes, draws)).toEqual(want)
    // StrictMode renders each pane twice; the second render keeps its claim.
    expect(serve(claims, panes, draws)).toEqual(want)
  })
})

describe('servedClaims', () => {
  it('gives each served pane the depth it sits at when that moved', () => {
    const claims: RenderClaims = new Map()
    // Rendered b before a, but a comes first in the document.
    serve(claims, [pane('b'), pane('a')])
    expect(servedClaims([pane('a'), pane('b')], closed, claims)).toEqual([
      { id: 'a', served: 2, sits: 1 },
      { id: 'b', served: 1, sits: 2 }
    ])
    expect(servedClaims([pane('b'), pane('a')], closed, claims)).toEqual([
      { id: 'b', served: 1, sits: null },
      { id: 'a', served: 2, sits: null }
    ])
  })

  it('skips a pane that was never served', () => {
    expect(servedClaims([list], closed, new Map())).toEqual([])
  })
})

const event = pane('event', { reached: true })

function rowOf(
  registered: readonly PlacedPane[],
  { draws = closed, revealRoot = false, withBack = false } = {}
) {
  const back = withBack ? { top: 'back on top', below: 'back below' } : null
  const claims: RenderClaims = new Map()
  const model = {
    ...paneModel(registered, draws, revealRoot),
    chrome: { top: 'top', none: 'none', back },
    claims
  }
  const place = (panes: readonly PlacedPane[], hydrating = false) =>
    panes.map(({ id, ...entry }) => placePane(model, id, entry, hydrating))
  return { place, claims }
}

describe('placePane', () => {
  it.each([
    {
      name: 'a list under a reached detail',
      panes: [list, event],
      want: [
        ['behind', 0, true],
        ['top', 1, false]
      ]
    },
    {
      name: 'a detail the route has not reached',
      panes: [{ ...list, reached: true }, pane('event')],
      want: [
        ['top', 0, true],
        ['ahead', 1, false]
      ]
    },
    {
      name: 'the generated secondary list as the root',
      panes: [
        pane('nav', { column: 'list', kind: 'generated-secondary' }),
        event
      ],
      opts: {
        draws: {
          ...closed,
          rootList: true,
          rootListDrawn: true,
          secondaryPane: true
        }
      },
      want: [
        ['behind', 0, true],
        ['top', 1, false]
      ]
    },
    {
      name: 'open More over a row that starts on a detail',
      panes: [
        event,
        pane('more', {
          column: 'list',
          kind: 'generated-overflow',
          reached: true
        })
      ],
      opts: {
        draws: { ...closed, overflow: true, moreOpen: true },
        revealRoot: true
      },
      want: [
        ['ahead', 1, false],
        ['top', 0, true]
      ]
    }
  ])('places $name', ({ panes, opts, want }) => {
    const placed = rowOf(panes, opts).place(panes)
    expect(placed.map((p) => [p.position, p.depth, p.isRoot])).toEqual(want)
  })

  it('tops a pane the moment it is reached, a commit before the row knows', () => {
    const [, placed] = rowOf([list, pane('event')]).place([list, event])
    expect(placed).toMatchObject({ position: 'top', registered: true })
  })

  it('places a pane before it registers by its declared depth', () => {
    const [placed] = rowOf([]).place([
      pane('late', { depth: 2, reached: true })
    ])
    expect(placed).toMatchObject({
      position: 'top',
      depth: 2,
      isRoot: false,
      registered: false
    })
  })

  it('serves an unregistered pane at its render-order depth while hydrating', () => {
    const { place } = rowOf([])
    expect(place([pane('a'), pane('b')], true).map((p) => p.depth)).toEqual([
      1, 2
    ])
  })

  it('takes a registered pane from the row, not a claim, while hydrating', () => {
    const { place, claims } = rowOf([list, event])
    expect(place([event], true)[0]?.depth).toBe(1)
    expect(claims.size).toBe(0)
  })

  it.each([
    {
      name: 'Back on the top detail at depth 1',
      panes: [list, event],
      withBack: true,
      want: ['none', 'back on top']
    },
    {
      name: 'Back under a deeper top',
      panes: [list, pane('event'), pane('ticket', { reached: true })],
      withBack: true,
      want: ['none', 'back below', 'top']
    },
    {
      name: 'nothing ahead of the top',
      panes: [{ ...list, reached: true }, pane('event')],
      withBack: true,
      want: ['top', 'none']
    },
    {
      name: 'only the top chrome with no Back',
      panes: [list, event],
      withBack: false,
      want: ['none', 'top']
    }
  ])('gives $name', ({ panes, withBack, want }) => {
    const placed = rowOf(panes, { withBack }).place(panes)
    expect(placed.map((p) => p.chrome)).toEqual(want)
  })
})
