import { describe, expect, it } from 'vitest'

import { type RecordFilter, recordFields } from '@oztix/roadie-core/records'

import {
  filterChipIds,
  filterKey,
  mergeFilter,
  searchChips,
  topSuggestions,
  valueSuggestions
} from './searchSuggestions'

type Gig = {
  name: string
  city: string
  starts: string
  placed: string
  sold: number
  accessible: boolean
}

const field = recordFields<Gig>()
const fields = [
  field.text('name', { label: 'Event' }),
  field.option('city', {
    label: 'City',
    options: [
      { value: 'melbourne', label: 'Melbourne' },
      { value: 'sydney', label: 'Sydney' },
      { value: 'perth', label: 'Perth' }
    ]
  }),
  field.date('starts', { label: 'Starts', moment: 'event' }),
  field.date('placed', { label: 'Placed' }),
  field.number('sold', { label: 'Sold' }),
  field.boolean('accessible', { label: 'Accessible' })
]

const context = (filters: RecordFilter[] = []) => ({
  fields,
  filters,
  // Midday Saturday 3 October 2026 in Sydney.
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
})

const labels = (groups: { items: readonly { label: string }[] }[]) =>
  groups.map((group) => group.items.map((item) => item.label))

const byKey = (key: string) => fields.find((f) => f.key === key)!

describe('topSuggestions', () => {
  it('lists the fields to filter by while empty', () => {
    const [group] = topSuggestions('', context())
    expect(group).toMatchObject({ id: 'fields', label: 'Filter by' })
    expect(group!.items.map((item) => item.value)).toEqual(
      fields.map(({ key }) => ({ type: 'field', field: key }))
    )
  })

  it('reads each part of the text, keeping the rest', () => {
    const [filters] = topSuggestions('melb this weekend', context())
    expect(filters!.items.slice(0, 2)).toMatchObject([
      {
        label: 'Starts: This weekend',
        description: '3 to 4 Oct 2026',
        remainder: 'melb'
      },
      {
        label: 'City is Melbourne',
        remainder: 'this weekend',
        value: {
          type: 'filter',
          filter: { field: 'city', operator: 'is', values: ['melbourne'] }
        }
      }
    ])
  })

  it('never suggests a filter already applied', () => {
    const melbourne: RecordFilter = {
      field: 'city',
      operator: 'is',
      values: ['melbourne']
    }
    const [filters] = topSuggestions('melb', context([melbourne]))
    expect(filters!.items.map((item) => item.label)).not.toContain(
      'City is Melbourne'
    )
  })

  it('never suggests a value its field’s chip already holds', () => {
    const [filters] = topSuggestions(
      'melb',
      context([
        { field: 'city', operator: 'is', values: ['perth', 'melbourne'] }
      ])
    )
    expect(filters!.items.map((item) => item.label)).not.toContain(
      'City is Melbourne'
    )
  })

  it('keeps the words a field didn’t read', () => {
    const [, found] = topSuggestions('ocean cit', context())
    expect(found!.items[0]).toMatchObject({ label: 'City', remainder: 'ocean' })
  })

  it('names fields the text starts', () => {
    const [, found] = topSuggestions('cit', context())
    expect(found!.items).toMatchObject([
      { kind: 'field', label: 'City', value: { type: 'field', field: 'city' } }
    ])
  })
})

describe('valueSuggestions', () => {
  it('lists an option field’s values, then narrows them', () => {
    expect(labels(valueSuggestions(byKey('city'), '', context()))).toEqual([
      ['Melbourne', 'Sydney', 'Perth']
    ])
    expect(labels(valueSuggestions(byKey('city'), 'syd', context()))).toEqual([
      ['Sydney']
    ])
  })

  it('takes typed text for an option field with no values to list', () => {
    const promoter = field.option('city', { label: 'Promoter' })
    expect(valueSuggestions(promoter, '', context())[0]!.items).toEqual([])
    expect(
      valueSuggestions(promoter, 'Thimble', context())[0]!.items
    ).toMatchObject([
      {
        label: 'Thimble',
        value: {
          type: 'filter',
          filter: { field: 'city', operator: 'is', values: ['Thimble'] }
        }
      }
    ])
  })

  it('offers Yes and No for a boolean', () => {
    expect(
      labels(valueSuggestions(byKey('accessible'), '', context()))
    ).toEqual([['Yes', 'No']])
  })

  it('offers upcoming dates for events and recent ones for timestamps, then custom dates', () => {
    const [starts] = valueSuggestions(byKey('starts'), '', context())
    expect(starts!.label).toBe('Starts')
    expect(starts!.items.slice(0, 3).map((item) => item.label)).toEqual([
      'Today',
      'Tomorrow',
      'This weekend'
    ])
    expect(starts!.items.at(-1)).toMatchObject({
      label: 'Custom dates',
      value: { type: 'edit', field: 'starts' }
    })
    const [placed] = valueSuggestions(byKey('placed'), '', context())
    expect(placed!.items[1]!.label).toBe('Yesterday')
  })

  it('reads typed dates for the field', () => {
    const [group] = valueSuggestions(byKey('starts'), 'after 1 dec', context())
    expect(group!.items[0]).toMatchObject({
      label: 'After 1 Dec',
      value: {
        type: 'filter',
        filter: { field: 'starts', operator: 'after', value: '2026-12-01' }
      }
    })
  })
})

describe('filterKey', () => {
  it('reads filters alike whatever their key or value order', () => {
    expect(
      filterKey({ field: 'city', operator: 'is', values: ['b', 'a'] })
    ).toBe(
      filterKey({
        values: ['a', 'b'],
        operator: 'is',
        field: 'city'
      } as RecordFilter)
    )
    expect(
      filterKey({
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 7, unit: 'day' }
      })
    ).toBe(
      filterKey({
        field: 'starts',
        operator: 'within',
        value: { unit: 'day', amount: 7, direction: 'next' }
      })
    )
  })
})

describe('filterChipIds', () => {
  it('names chips by their filter, counting repeats', () => {
    const perth: RecordFilter = {
      field: 'city',
      operator: 'is',
      values: ['perth']
    }
    const [a, b, c] = filterChipIds([
      perth,
      { field: 'sold', operator: 'gt', value: 1 },
      perth
    ])
    expect(a).not.toBe(c)
    expect(
      filterChipIds([{ field: 'sold', operator: 'gt', value: 1 }, perth])
    ).toEqual([b, a])
  })
})

describe('mergeFilter', () => {
  const sydney: RecordFilter = {
    field: 'city',
    operator: 'is',
    values: ['sydney']
  }

  it('adds an option value to the field’s chip', () => {
    expect(
      mergeFilter(
        [{ field: 'sold', operator: 'gt', value: 1 }, sydney],
        { field: 'city', operator: 'is', values: ['perth'] },
        fields
      )
    ).toEqual({
      index: 1,
      filter: { field: 'city', operator: 'is', values: ['sydney', 'perth'] }
    })
  })

  it('leaves other filters alone', () => {
    expect(
      mergeFilter(
        [sydney],
        { field: 'city', operator: 'is-not', values: ['perth'] },
        fields
      )
    ).toBeNull()
    expect(
      mergeFilter(
        [{ field: 'name', operator: 'is', values: ['a'] }],
        { field: 'name', operator: 'is', values: ['b'] },
        fields
      )
    ).toBeNull()
  })
})

describe('searchChips', () => {
  it('marks a scope filter these fields can’t apply', () => {
    const [chip] = searchChips(
      {
        scope: [{ field: 'venue', operator: 'is', values: ['x'] }],
        filters: [],
        skipped: []
      },
      context()
    )
    expect(chip).toMatchObject({ locked: true, intent: 'warning' })
  })

  it('puts locked scope chips first, and marks a filter that can’t apply', () => {
    const chips = searchChips(
      {
        scope: [{ field: 'city', operator: 'is', values: ['perth'] }],
        filters: [
          { field: 'starts', operator: 'within', value: 'this-weekend' },
          { field: 'promoter', operator: 'is', values: ['x'] }
        ],
        skipped: [1]
      },
      context()
    )
    expect(chips).toEqual([
      { id: 'scope:0', label: 'City is Perth', locked: true },
      {
        id: expect.stringMatching(/^filter:.*#0$/),
        label: 'Starts: This weekend',
        description: '3 to 4 Oct 2026'
      },
      {
        id: expect.stringMatching(/^filter:.*#0$/),
        label: 'promoter is x',
        intent: 'warning',
        description: 'Not applied: these records can’t be filtered this way'
      }
    ])
  })
})
