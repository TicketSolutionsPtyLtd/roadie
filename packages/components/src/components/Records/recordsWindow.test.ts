import { describe, expect, it } from 'vitest'

import {
  type WindowItem,
  type WindowView,
  firstVisibleRow,
  recordsWindow
} from './recordsWindow'

const ROW = 48

/** Rows of 48px from `from`, as the virtualiser places them under a 100px margin. */
const placed = (from: number, to: number): WindowItem[] =>
  Array.from({ length: to - from + 1 }, (_, offset) => {
    const index = from + offset
    return { index, start: 100 + index * ROW, end: 100 + (index + 1) * ROW }
  })

const view = (overrides: Partial<WindowView> = {}): WindowView => ({
  items: placed(0, 3),
  total: 10 * ROW,
  margin: 100,
  offset: 100,
  inset: 0,
  fixed: true,
  ...overrides
})

const record = (index: number) => ({ id: `show-${index}`, row: {} })

const range = (loaded: number, count = 10) => ({
  key: 'q',
  count,
  failed: [{ start: 0, end: 50 }],
  rowAt: (index: number) => (index < loaded ? record(index) : undefined)
})

const shape = (cells: ReturnType<typeof recordsWindow>['cells']) =>
  cells.map(({ key, index, row, leads, failed }) =>
    [key, index, row, leads, failed]
      .filter((part) => part !== undefined)
      .join(' ')
  )

describe('firstVisibleRow', () => {
  it.each([
    { offset: 100, inset: 36, row: 0 },
    { offset: 112, inset: 36, row: 1 },
    { offset: 160, inset: 36, row: 2 },
    { offset: 400, inset: 0, row: undefined }
  ])(
    'at $offset px under a $inset px header, is row $row',
    ({ offset, inset, row }) => {
      expect(firstVisibleRow(placed(0, 3), offset, inset)).toBe(row)
    }
  )

  it('is undefined with no rows placed', () => {
    expect(firstVisibleRow([], 0, 0)).toBeUndefined()
  })
})

describe('recordsWindow cells', () => {
  it('keys loaded rows by record id', () => {
    const rows = Array.from({ length: 10 }, (_, index) => record(index))
    const { cells } = recordsWindow(view({ items: placed(2, 3) }), { rows })
    expect(cells).toEqual([
      { key: 'show-2', index: 2, row: 2, leads: true, record: rows[2] },
      { key: 'show-3', index: 3, row: 3, leads: true, record: rows[3] }
    ])
  })

  it('keys range rows by query and index, with gaps loading', () => {
    const { cells } = recordsWindow(view({ items: placed(1, 2) }), {
      range: { ...range(2), failed: [] }
    })
    expect(cells).toEqual([
      { key: 'q@1', index: 1, row: 1, leads: true, record: record(1) },
      { key: 'q@2', index: 2, row: 2, leads: true }
    ])
  })

  it.each([
    {
      name: 'at the first row clear of the stuck header',
      loaded: 0,
      at: view({ items: placed(2, 5), offset: 100 + 3 * ROW - 20, inset: 20 }),
      error: 3
    },
    {
      name: 'at the first row not loaded when part of the range is',
      loaded: 5,
      at: view({ items: placed(3, 7) }),
      error: 5
    },
    {
      name: 'at the first row on screen when none is clear of the header',
      loaded: 0,
      at: view({ items: placed(2, 5), offset: 1000, visibleStart: 4 }),
      error: 4
    },
    {
      name: 'within the count when the screen is past it',
      loaded: 5,
      at: view({ items: placed(3, 7), offset: 1000, visibleStart: 30 }),
      error: 5
    }
  ])('shows a failed range’s error $name', ({ loaded, at, error }) => {
    const { cells } = recordsWindow(at, { range: range(loaded) })
    expect(cells.filter((cell) => cell.failed === 'error')).toEqual([
      {
        key: 'range-error-0',
        index: error,
        row: error,
        leads: true,
        failed: 'error'
      }
    ])
    expect(
      cells
        .filter((cell) => cell.record === undefined && cell.index !== error)
        .every((cell) => cell.failed === 'blank')
    ).toBe(true)
  })

  it('lays a grid row’s records out across its columns, clamped to the count', () => {
    const { cells } = recordsWindow(view({ items: placed(1, 2) }), {
      range: { ...range(3, 5), failed: [] },
      columns: 3
    })
    expect(shape(cells)).toEqual(['q@3 3 1 true', 'q@4 4 1 false'])
  })

  it('shows a grid’s error at the first record of the first clear row', () => {
    const { cells } = recordsWindow(
      view({ items: placed(0, 2), offset: 100 + ROW }),
      { range: range(0, 9), columns: 3 }
    )
    expect(shape(cells)).toEqual([
      'q@0 0 0 true blank',
      'q@1 1 0 false blank',
      'q@2 2 0 false blank',
      'range-error-0 3 1 true error',
      'q@4 4 1 false blank',
      'q@5 5 1 false blank',
      'q@6 6 2 true blank',
      'q@7 7 2 false blank',
      'q@8 8 2 false blank'
    ])
  })
})

describe('recordsWindow padding', () => {
  it.each([
    {
      name: 'holds fixed rows’ total',
      at: view({ items: placed(2, 3) }),
      padding: {
        paddingBlockStart: 96,
        paddingBlockEnd: 288,
        minBlockSize: 480
      }
    },
    {
      name: 'leaves measured rows free to size',
      at: view({ items: placed(2, 3), fixed: false }),
      padding: {
        paddingBlockStart: 96,
        paddingBlockEnd: 288,
        minBlockSize: undefined
      }
    },
    {
      name: 'is nothing with no rows placed',
      at: view({ items: [] }),
      padding: { paddingBlockStart: 0, paddingBlockEnd: 0, minBlockSize: 480 }
    }
  ])('$name', ({ at, padding }) => {
    expect(recordsWindow(at, { rows: [] }).padding).toEqual(padding)
  })
})
