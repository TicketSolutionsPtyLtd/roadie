import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { groupRecords, groupRecordsBy, groupableFields } from './groups'

type Show = { id: string; status?: string | null; tags?: string[] }
const field = recordFields<Show>()
const status = field.option('status', {
  label: 'AU status',
  status: {
    on_sale: { intent: 'success' },
    sold_out: { intent: 'danger' },
    cancelled: { intent: 'neutral' }
  }
})
const summary = (...statuses: Show['status'][]) =>
  groupRecords(
    statuses.map((value, index) => ({
      id: `show-${index}`,
      row: { id: `show-${index}`, status: value }
    })),
    status
  ).map(({ key, label, rows }) => [key, label, rows.map(({ id }) => id)])

describe('groupRecords', () => {
  it("puts each record in its value's group, in option order, keeping the rows' order and empty groups", () => {
    expect(summary('sold_out', 'on_sale', 'sold_out')).toEqual([
      ['on_sale', 'On sale', ['show-1']],
      ['sold_out', 'Sold out', ['show-0', 'show-2']],
      ['cancelled', 'Cancelled', []]
    ])
  })

  it('follows the options with values that are not options, then the records with none', () => {
    expect(summary(undefined, 'postponed', null, '').slice(3)).toEqual([
      ['postponed', 'postponed', ['show-1']],
      [null, 'No AU status', ['show-0', 'show-2', 'show-3']]
    ])
  })
})

describe('groupRecordsBy', () => {
  const venue = field.option('tags', {
    label: 'Venue',
    options: [
      { value: 'corner', label: 'Corner' },
      { value: 'forum', label: 'Forum' }
    ]
  })
  const rows = (
    [
      ['sold_out', 'forum'],
      ['on_sale', 'corner'],
      ['sold_out', 'corner'],
      ['sold_out', 'forum']
    ] as const
  ).map(([value, tags], index) => ({
    id: `show-${index}`,
    row: {
      id: `show-${index}`,
      status: value,
      tags: tags as unknown as string[]
    }
  }))
  const tree = (groups: ReturnType<typeof groupRecordsBy>): unknown =>
    groups.map(({ label, rows, groups: inner }) =>
      inner ? [label, tree(inner)] : [label, rows.map(({ id }) => id)]
    )

  it('nests each level inside the one before, keeping empty groups and row order', () => {
    expect(tree(groupRecordsBy(rows, [status, venue]))).toEqual([
      [
        'On sale',
        [
          ['Corner', ['show-1']],
          ['Forum', []]
        ]
      ],
      [
        'Sold out',
        [
          ['Corner', ['show-2']],
          ['Forum', ['show-0', 'show-3']]
        ]
      ],
      [
        'Cancelled',
        [
          ['Corner', []],
          ['Forum', []]
        ]
      ]
    ])
  })

  it('holds every row of a group at each level, with the field it groups by', () => {
    const [, soldOut] = groupRecordsBy(rows, [status, venue])
    expect(soldOut!.rows.map(({ id }) => id)).toEqual([
      'show-0',
      'show-2',
      'show-3'
    ])
    expect(soldOut!.field).toBe(status)
    expect(soldOut!.groups![0]!.field).toBe(venue)
  })

  it('is one level of groups, with no inner groups, for one field', () => {
    expect(groupRecordsBy(rows, [status]).every((group) => !group.groups)).toBe(
      true
    )
  })
})

describe('groupableFields', () => {
  it('keeps single-valued fields with options, as core validates groupBy', () => {
    const fields = [
      status,
      field.text('id', { label: 'ID' }),
      field.option('tags', {
        label: 'Tags',
        multiple: true,
        options: [{ value: 'a', label: 'A' }]
      })
    ]
    expect(groupableFields(fields).map(({ key }) => key)).toEqual(['status'])
  })
})
