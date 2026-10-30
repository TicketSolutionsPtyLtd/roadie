import { describe, expect, it } from 'vitest'

import {
  type PagingInput,
  identifyRows,
  loadedRows,
  paging,
  rowIndexes,
  setupWarnings,
  whole
} from './listState'

describe('whole', () => {
  it.each<[number | undefined, number, number, number]>([
    [undefined, 0, 7, 7],
    [NaN, 0, 7, 7],
    [Infinity, 0, 7, 7],
    [2.9, 0, 7, 2],
    [-3, 0, 7, 0],
    [0, 1, 50, 1]
  ])('reads %s, at least %i, else %i, as %i', (value, min, fallback, read) => {
    expect(whole(value, min, fallback)).toBe(read)
  })
})

describe('loadedRows', () => {
  const a = { id: 'a' }
  const b = { id: 'b' }

  it('keeps data itself when it has no gaps', () => {
    const data = [a, b]
    expect(loadedRows(data)).toEqual({ rows: data, at: [0, 1] })
    expect(loadedRows(data).rows).toBe(data)
  })

  it('leaves gaps out, keeping each record’s index', () => {
    expect(loadedRows([undefined, a, undefined, b])).toEqual({
      rows: [a, b],
      at: [1, 3]
    })
  })
})

describe('rowIndexes and identifyRows', () => {
  const a = { id: 'a' }
  const b = { id: 'b' }

  it('gives each copy of a repeated record its own index, in order', () => {
    const indexes = rowIndexes(loadedRows([a, b, a]))
    expect(indexes.get(a)).toEqual([0, 2])
    expect(
      identifyRows([b, a, a], indexes, (_, index) => String(index))
    ).toEqual([
      { id: '1', row: b },
      { id: '0', row: a },
      { id: '2', row: a }
    ])
  })
})

describe('paging', () => {
  const base: PagingInput = {
    ranged: false,
    server: false,
    count: undefined,
    countExact: true,
    range: {},
    matched: 120,
    loaded: 120,
    page: 0,
    pageSize: 50,
    settled: true
  }

  it.each<[string, Partial<PagingInput>, Partial<ReturnType<typeof paging>>]>([
    [
      'counts browser matches into pages',
      {},
      { resultCount: 120, resultCountExact: true, pageCount: 3, lastPage: 2 }
    ],
    ['keeps one page with nothing to show', { matched: 0 }, { pageCount: 1 }],
    [
      'counts a server’s total',
      { server: true, count: 1000 },
      { resultCount: 1000, pageCount: 20 }
    ],
    [
      'pages only within a floor the server stopped counting at',
      { server: true, count: 1020, countExact: false },
      { resultCountExact: false, pageCount: 20 }
    ],
    [
      'is one long page in range mode, counting the range total',
      {
        ranged: true,
        range: { total: 900, rowCount: 900, rowCountExact: true }
      },
      { resultCount: 900, pageCount: 1, outOfRange: false }
    ],
    [
      'counts the loaded records in range mode before a total',
      { ranged: true, loaded: 40 },
      { resultCount: 40, resultCountExact: true }
    ],
    [
      'clamps a page past the last',
      { page: 5 },
      { outOfRange: true, lastPage: 2 }
    ],
    [
      'never clamps while a load is pending or failed',
      { page: 5, settled: false },
      { outOfRange: false }
    ]
  ])('%s', (_, input, expected) => {
    expect(paging({ ...base, ...input })).toMatchObject(expected)
  })
})

describe('setupWarnings', () => {
  const none = {
    skipped: [],
    unidentified: false,
    rangeUnidentified: false,
    rangePaged: false,
    capped: false,
    sumsPage: false,
    sumsRanges: false
  }

  it('warns of nothing for a setup that works', () => {
    expect(setupWarnings(none)).toEqual([])
  })

  it('lists each problem once, skipped parts first', () => {
    const warnings = setupWarnings({
      ...none,
      skipped: ['filter 0: no field "x"'],
      sumsPage: true
    })
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain('filter 0: no field "x"')
    expect(warnings[1]).toContain("can't sum in server mode")
  })
})
