import { describe, expect, it } from 'vitest'

import { equalViews } from './equal'
import type { RecordView } from './types'

const base: RecordView = {
  id: 'upcoming',
  name: 'Upcoming',
  entity: 'events',
  query: {
    search: 'neon nights',
    filters: [
      {
        field: 'venue',
        operator: 'is',
        values: ['velvet-room', 'harbourside-hall']
      },
      {
        field: 'starts',
        operator: 'within',
        value: { period: 'month', offset: 0, toDate: true }
      }
    ],
    sort: [
      { field: 'starts', direction: 'ascending' },
      { field: 'name', direction: 'ascending' }
    ]
  },
  layout: {
    type: 'table',
    columns: { order: ['name', 'starts'], hidden: ['gross', 'capacity'] }
  }
}

const withQuery = (query: Partial<RecordView['query']>): RecordView => ({
  ...base,
  query: { ...base.query, ...query }
})

describe('equalViews', () => {
  it.each<[string, RecordView]>([
    ['itself', base],
    ['a renamed copy', { ...base, id: 'copy', name: 'Copy' }],
    ['search spacing', withQuery({ search: '  neon   nights ' })],
    [
      'chips in another order',
      withQuery({ filters: [...base.query.filters].reverse() })
    ],
    [
      'values in another order',
      withQuery({
        filters: [
          {
            field: 'venue',
            operator: 'is',
            values: ['harbourside-hall', 'velvet-room']
          },
          base.query.filters[1]!
        ]
      })
    ],
    [
      'range keys in another order',
      withQuery({
        filters: [
          base.query.filters[0]!,
          {
            field: 'starts',
            operator: 'within',
            value: { toDate: true, offset: 0, period: 'month' }
          }
        ]
      })
    ],
    [
      'hidden columns in another order',
      {
        ...base,
        layout: {
          type: 'table',
          columns: { order: ['name', 'starts'], hidden: ['capacity', 'gross'] }
        }
      }
    ],
    [
      'a repeated chip',
      withQuery({ filters: [...base.query.filters, base.query.filters[0]!] })
    ]
  ])('treats %s as the same view', (_, other) => {
    expect(equalViews(base, other)).toBe(true)
  })

  it('treats a repeated hidden column as the same view', () => {
    expect(
      equalViews(
        { ...base, layout: { type: 'table', columns: { hidden: ['gross'] } } },
        {
          ...base,
          layout: { type: 'table', columns: { hidden: ['gross', 'gross'] } }
        }
      )
    ).toBe(true)
  })

  it('treats missing and empty layout lists as the same', () => {
    expect(
      equalViews(
        { ...base, layout: { type: 'table' } },
        {
          ...base,
          layout: { type: 'table', columns: { order: [], hidden: [] } }
        }
      )
    ).toBe(true)
    expect(
      equalViews(
        { ...base, layout: { type: 'grid' } },
        { ...base, layout: { type: 'grid', fields: [] } }
      )
    ).toBe(true)
  })

  it.each<[string, RecordView]>([
    ['a different search', withQuery({ search: 'neon' })],
    ['a chip removed', withQuery({ filters: base.query.filters.slice(1) })],
    [
      'the operator flipped',
      withQuery({
        filters: [
          { ...base.query.filters[0]!, operator: 'is-not' } as never,
          base.query.filters[1]!
        ]
      })
    ],
    [
      'sort in another order',
      withQuery({ sort: [...base.query.sort].reverse() })
    ],
    [
      'sort direction',
      withQuery({
        sort: [
          { field: 'starts', direction: 'descending' },
          base.query.sort[1]!
        ]
      })
    ],
    [
      'columns reordered',
      {
        ...base,
        layout: {
          type: 'table',
          columns: { order: ['starts', 'name'], hidden: ['gross', 'capacity'] }
        }
      }
    ],
    ['another layout', { ...base, layout: { type: 'grid' } }],
    ['another entity', { ...base, entity: 'orders' }],
    ['a group', { ...base, group: 'venue' }]
  ])('notices %s', (_, other) => {
    expect(equalViews(base, other)).toBe(false)
  })
})
