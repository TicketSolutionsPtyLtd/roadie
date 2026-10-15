import { describe, expect, it } from 'vitest'

import { type RecordFilter, recordFields } from '@oztix/roadie-core/records'

import {
  type ValueOperator,
  filterChipIds,
  filterKey,
  mergeFilter,
  pendingLabel,
  searchChips,
  stepOperator,
  toggleValue,
  topSuggestions,
  valueOperators,
  valueSuggestions,
  valueText
} from './searchSuggestions'

type Gig = {
  name: string
  gross: number
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
  field.money('gross', { label: 'Gross' }),
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
const valuesOf = (groups: readonly { id: string }[]) =>
  groups.find((group) => group.id === 'values') as ReturnType<
    typeof valueSuggestions
  >[number]

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
  it('lists Empty and Not empty above an option field’s values, then narrows them', () => {
    expect(labels(valueSuggestions(byKey('city'), '', context()))).toEqual([
      ['Empty', 'Not empty'],
      ['Melbourne', 'Sydney', 'Perth']
    ])
    expect(labels(valueSuggestions(byKey('city'), 'syd', context()))).toEqual([
      ['Sydney']
    ])
  })

  it('names Empty and Not empty’s group for screen readers only', () => {
    const [emptiness] = valueSuggestions(byKey('city'), '', context())
    expect(emptiness).toMatchObject({
      id: 'empty',
      label: 'Empty',
      hideLabel: true
    })
  })

  it('takes typed text for an option field with no values to list', () => {
    const promoter = field.option('city', { label: 'Promoter' })
    expect(labels(valueSuggestions(promoter, '', context()))).toEqual([
      ['Empty', 'Not empty'],
      []
    ])
    expect(
      valuesOf(valueSuggestions(promoter, 'Thimble', context())).items
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
    ).toEqual([
      ['Empty', 'Not empty'],
      ['Yes', 'No']
    ])
  })

  it('offers upcoming dates for events and recent ones for timestamps, then custom dates', () => {
    const starts = valuesOf(valueSuggestions(byKey('starts'), '', context()))
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
    const placed = valuesOf(valueSuggestions(byKey('placed'), '', context()))
    expect(placed!.items[1]!.label).toBe('Yesterday')
  })

  it('drops Custom dates for typed text only Empty or Not empty match', () => {
    const custom = (text: string) =>
      valuesOf(valueSuggestions(byKey('starts'), text, context()))
        .items.map((item) => item.label)
        .includes('Custom dates')
    expect(custom('emp')).toBe(false)
    expect(custom('zzz')).toBe(true)
    expect(custom('after 1 dec')).toBe(true)
  })

  it('compares an option field’s values by the chosen operator, listed or typed', () => {
    const listed = valuesOf(
      valueSuggestions(byKey('city'), '', context(), 'is-not')
    )
    expect(listed!.items[0]!.value).toEqual({
      type: 'filter',
      filter: { field: 'city', operator: 'is-not', values: ['melbourne'] }
    })
    const typed = valuesOf(
      valueSuggestions(byKey('city'), 'syd', context(), 'has-all')
    )
    expect(typed!.items).toMatchObject([
      {
        label: 'Sydney',
        value: {
          type: 'filter',
          filter: { field: 'city', operator: 'has-all', values: ['sydney'] }
        }
      }
    ])
  })

  it('narrows Empty and Not empty by the start of a word, and drops one applied', () => {
    expect(labels(valueSuggestions(byKey('city'), 'not', context()))).toEqual([
      ['Not empty'],
      []
    ])
    expect(labels(valueSuggestions(byKey('city'), 'emp', context()))).toEqual([
      ['Empty', 'Not empty'],
      []
    ])
    expect(labels(valueSuggestions(byKey('city'), 'mpty', context()))).toEqual([
      []
    ])
    expect(
      labels(
        valueSuggestions(
          byKey('city'),
          '',
          context([{ field: 'city', operator: 'is-not-set' }])
        )
      )
    ).toEqual([['Not empty'], ['Melbourne', 'Sydney', 'Perth']])
  })

  it('compares a typed value by the operator for an option field with no values to list', () => {
    const promoter = field.option('city', { label: 'Promoter' })
    const group = valuesOf(
      valueSuggestions(promoter, 'Thimble', context(), 'is-not')
    )
    expect(group!.items[0]!.value).toEqual({
      type: 'filter',
      filter: { field: 'city', operator: 'is-not', values: ['Thimble'] }
    })
  })

  it('offers no Empty or Not empty to a field that can’t filter by them', () => {
    const dates = field.date('starts', { label: 'Dates', multiple: true })
    expect(labels(valueSuggestions(dates, '', context())).flat()).not.toContain(
      'Empty'
    )
  })

  it('reads typed dates for the field', () => {
    const group = valuesOf(
      valueSuggestions(byKey('starts'), 'after 1 dec', context())
    )
    expect(group!.items[0]).toMatchObject({
      label: 'After 1 Dec',
      value: {
        type: 'filter',
        filter: { field: 'starts', operator: 'after', value: '2026-12-01' }
      }
    })
  })
})

describe('valueSuggestions for text and numbers', () => {
  const typedFilters = (key: string, text: string, operator?: ValueOperator) =>
    valuesOf(valueSuggestions(byKey(key), text, context(), operator)).items.map(
      (item) => item.value.type === 'filter' && item.value.filter
    )

  it('offers only Empty and Not empty until something is typed', () => {
    expect(labels(valueSuggestions(byKey('name'), '', context()))).toEqual([
      ['Empty', 'Not empty'],
      []
    ])
    expect(labels(valueSuggestions(byKey('sold'), '', context()))).toEqual([
      ['Empty', 'Not empty'],
      []
    ])
  })

  it('reads typed text as one row under the operator, worded as its chip', () => {
    expect(
      labels(
        valueSuggestions(byKey('name'), ' disco ', context(), 'not-contains')
      )
    ).toEqual([['Event doesn’t contain “disco”']])
    expect(typedFilters('name', 'disco')).toEqual([
      { field: 'name', operator: 'contains', value: 'disco' }
    ])
    expect(typedFilters('name', 'OZ-1', 'is-not')).toEqual([
      { field: 'name', operator: 'is-not', values: ['OZ-1'] }
    ])
  })

  it.each<[string, string, ValueOperator, RecordFilter | undefined]>([
    ['sold', '50', 'eq', { field: 'sold', operator: 'eq', value: 50 }],
    ['sold', '50', 'neq', { field: 'sold', operator: 'neq', value: 50 }],
    ['sold', '50', 'lt', { field: 'sold', operator: 'lt', value: 50 }],
    ['gross', '$1,500', 'gt', { field: 'gross', operator: 'gt', value: 1500 }],
    [
      'sold',
      '20-50',
      'between',
      { field: 'sold', operator: 'between', value: [20, 50] }
    ],
    [
      'sold',
      '20 to 50',
      'between',
      { field: 'sold', operator: 'between', value: [20, 50] }
    ],
    [
      'gross',
      '$20..$1,000',
      'between',
      { field: 'gross', operator: 'between', value: [20, 1000] }
    ],
    ['sold', '50', 'between', undefined],
    ['sold', '50-20', 'between', undefined],
    ['sold', '20-50', 'eq', undefined],
    ['sold', '>50', 'eq', undefined],
    ['sold', 'fifty', 'eq', undefined],
    ['sold', '1,2', 'eq', undefined]
  ])('reads %s “%s” under %s', (key, text, operator, filter) => {
    expect(typedFilters(key, text, operator)).toEqual(filter ? [filter] : [])
  })

  it('words a number row as its chip reads', () => {
    expect(
      labels(valueSuggestions(byKey('gross'), '1500', context(), 'gt'))
    ).toEqual([['Gross is more than $1,500']])
  })

  it('keeps the typed text while editing, so the taken row stays ticked', () => {
    const edited: RecordFilter = { field: 'sold', operator: 'gt', value: 100 }
    const [row] = valuesOf(
      valueSuggestions(byKey('sold'), '100', context(), 'gt', edited)
    ).items
    expect(row).toMatchObject({ selected: true, remainder: '100' })
    const [added] = valuesOf(
      valueSuggestions(byKey('sold'), '100', context(), 'gt')
    ).items
    expect(added!.remainder).toBeUndefined()
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

const tickedIn = (groups: ReturnType<typeof valueSuggestions>) =>
  groups.flatMap((group) =>
    group.items.filter((item) => item.selected).map((item) => item.label)
  )

describe('valueSuggestions while editing a filter', () => {
  it('ticks the values the edited filter holds, under its operator', () => {
    const edited: RecordFilter = {
      field: 'city',
      operator: 'is-not',
      values: ['perth', 'sydney']
    }
    expect(
      tickedIn(valueSuggestions(byKey('city'), '', context(), 'is-not', edited))
    ).toEqual(['Sydney', 'Perth'])
  })

  it('lists a held value the field doesn’t offer, while it matches the text', () => {
    const edited: RecordFilter = {
      field: 'city',
      operator: 'is',
      values: ['perth', 'darwin']
    }
    const values = (text: string) =>
      valuesOf(
        valueSuggestions(byKey('city'), text, context(), 'is', edited)
      ).items.map((item) => [item.label, !!item.selected])
    expect(values('')).toEqual([
      ['Melbourne', false],
      ['Sydney', false],
      ['Perth', true],
      ['darwin', true]
    ])
    expect(values('dar')).toEqual([['darwin', true]])
  })

  it('lists a held value once, where the typed value names it', () => {
    const venue = field.option('city', { label: 'Venue' })
    const edited: RecordFilter = {
      field: 'city',
      operator: 'is',
      values: ['the corner']
    }
    const groups = valueSuggestions(
      venue,
      'the corner',
      { ...context(), fields: [venue] },
      'is',
      edited
    )
    expect(
      valuesOf(groups).items.map((item) => [item.label, !!item.selected])
    ).toEqual([['the corner', true]])
  })

  it('ticks Empty, a boolean answer, or a date preset the filter is', () => {
    expect(
      tickedIn(
        valueSuggestions(byKey('city'), '', context(), 'is', {
          field: 'city',
          operator: 'is-not-set'
        })
      )
    ).toEqual(['Empty'])
    expect(
      tickedIn(
        valueSuggestions(byKey('accessible'), '', context(), 'is', {
          field: 'accessible',
          operator: 'is-false'
        })
      )
    ).toEqual(['No'])
    expect(
      tickedIn(
        valueSuggestions(byKey('starts'), '', context(), 'is', {
          field: 'starts',
          operator: 'within',
          value: 'this-weekend'
        })
      )
    ).toEqual(['This weekend'])
  })
})

describe('toggleValue', () => {
  const perth: RecordFilter = {
    field: 'city',
    operator: 'is',
    values: ['perth']
  }

  it('adds a value the filter lacks, and takes out one it holds', () => {
    expect(
      toggleValue(perth, { field: 'city', operator: 'is', values: ['sydney'] })
    ).toEqual({ field: 'city', operator: 'is', values: ['perth', 'sydney'] })
    expect(
      toggleValue(
        { ...perth, values: ['perth', 'sydney'] },
        { field: 'city', operator: 'is', values: ['perth'] }
      )
    ).toEqual({ field: 'city', operator: 'is', values: ['sydney'] })
  })

  it('leaves nothing once the last value is taken out', () => {
    expect(toggleValue(perth, perth)).toBeNull()
  })

  it('replaces a filter of another kind', () => {
    const empty: RecordFilter = { field: 'city', operator: 'is-not-set' }
    expect(toggleValue(perth, empty)).toEqual(empty)
    expect(toggleValue(empty, perth)).toEqual(perth)
    expect(
      toggleValue(perth, { field: 'city', operator: 'is-not', values: ['x'] })
    ).toEqual({ field: 'city', operator: 'is-not', values: ['x'] })
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
    const [skipped] = searchChips(
      {
        scope: [{ field: 'sold', operator: 'gt', value: 1 }],
        filters: [],
        skipped: [],
        skippedScope: [0]
      },
      context()
    )
    expect(skipped).toMatchObject({ intent: 'warning' })
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

  it('names a relative range without its dates until the clock is known', () => {
    const starts: RecordFilter = {
      field: 'starts',
      operator: 'within',
      value: 'this-weekend'
    }
    const [scope, filter] = searchChips(
      { scope: [starts], filters: [starts], skipped: [] },
      { ...context(), now: new Date(0) }
    )
    expect(scope).toEqual({
      id: 'scope:0',
      label: 'Starts: This weekend',
      locked: true
    })
    expect(filter).not.toHaveProperty('description')
  })
})

describe('valueOperators', () => {
  it('toggles an option field between is and is not, plus has all when it holds several', () => {
    expect(valueOperators(byKey('city'))).toEqual([
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' }
    ])
    expect(
      valueOperators({ ...byKey('city'), multiple: true }).map(
        (operator) => operator.value
      )
    ).toEqual(['is', 'is-not', 'has-all'])
  })

  it('gives boolean and date fields no toggle', () => {
    expect(valueOperators(byKey('accessible'))).toEqual([])
    expect(valueOperators(byKey('starts'))).toEqual([])
  })

  it('toggles a text field between contains, doesn’t contain, is and is not', () => {
    expect(valueOperators(byKey('name'))).toEqual([
      { value: 'contains', label: 'contains' },
      { value: 'not-contains', label: 'doesn’t contain' },
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' }
    ])
  })

  it('shows a number’s operators as symbols, named in words', () => {
    expect(valueOperators(byKey('gross'))).toEqual([
      { value: 'eq', label: '=', 'aria-label': 'is' },
      { value: 'neq', label: '≠', 'aria-label': 'is not' },
      { value: 'lt', label: '<', 'aria-label': 'is less than' },
      { value: 'gt', label: '>', 'aria-label': 'is more than' },
      { value: 'between', label: 'between', 'aria-label': 'is between' }
    ])
  })
})

describe('stepOperator', () => {
  it('keeps an operator the field’s step offers, or starts on its first', () => {
    expect(stepOperator(byKey('name'), 'is-not')).toBe('is-not')
    expect(stepOperator(byKey('name'), 'is-not-set')).toBe('contains')
    expect(stepOperator(byKey('sold'), 'gt')).toBe('gt')
    expect(stepOperator(byKey('sold'), 'contains')).toBe('eq')
    expect(stepOperator(byKey('city'), 'has-all')).toBe('is')
    expect(stepOperator(byKey('starts'), 'between')).toBe('is')
  })
})

describe('pendingLabel', () => {
  it('reads the field and its operator in words', () => {
    expect(pendingLabel(byKey('name'), 'not-contains')).toBe(
      'Event doesn’t contain'
    )
    expect(pendingLabel(byKey('sold'), 'lt')).toBe('Sold is less than')
    expect(pendingLabel(byKey('starts'), 'is')).toBe('Starts')
    expect(pendingLabel(byKey('accessible'), 'is')).toBe('Accessible is')
  })
})

describe('valueText', () => {
  it.each<[string, RecordFilter, string]>([
    [
      'contains',
      { field: 'name', operator: 'contains', value: 'disco' },
      'disco'
    ],
    ['is', { field: 'name', operator: 'is', values: ['OZ-1'] }, 'OZ-1'],
    ['a number', { field: 'sold', operator: 'gt', value: 1500 }, '1500'],
    [
      'a range',
      { field: 'gross', operator: 'between', value: [20, 50] },
      '20-50'
    ],
    ['emptiness', { field: 'name', operator: 'is-set' }, ''],
    ['an option', { field: 'city', operator: 'is', values: ['perth'] }, '']
  ])('prefills %s as typed', (_, filter, text) => {
    expect(valueText(byKey(filter.field), filter)).toBe(text)
  })
})
