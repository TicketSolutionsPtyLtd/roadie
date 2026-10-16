import { describe, expect, it } from 'vitest'

import { type RecordFilter, recordFields } from '@oztix/roadie-core/records'

import {
  type ValueOperator,
  filterChipIds,
  filterKey,
  heldHint,
  mergeFilter,
  pendingLabel,
  rulesOut,
  searchChips,
  stepOperator,
  toggleValue,
  topSuggestions,
  valueHint,
  valueOperators,
  valueSuggestions,
  valueText,
  withAnd
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
        label: 'Starts is this weekend',
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

  it('lists only the chip’s row under emptiness, whatever is typed, for Enter', () => {
    expect(
      valuesOf(valueSuggestions(byKey('city'), 'syd', context(), 'is-not-set'))
        .items
    ).toMatchObject([
      {
        label: 'City is empty',
        exact: true,
        value: {
          type: 'filter',
          filter: { field: 'city', operator: 'is-not-set' }
        }
      }
    ])
    expect(
      labels(valueSuggestions(byKey('sold'), '', context(), 'is-set'))
    ).toEqual([['Sold is not empty']])
    expect(
      labels(valueSuggestions(byKey('starts'), '', context(), 'is-set'))
    ).toEqual([['Starts is not empty']])
  })

  it('ticks the emptiness row once its chip is applied, so the step still answers', () => {
    expect(
      valuesOf(
        valueSuggestions(
          byKey('city'),
          'syd',
          context([{ field: 'city', operator: 'is-not-set' }]),
          'is-not-set'
        )
      ).items
    ).toMatchObject([{ label: 'City is empty', exact: true, selected: true }])
    expect(
      valuesOf(valueSuggestions(byKey('city'), '', context(), 'is-not-set'))
        .items[0]?.selected
    ).toBeUndefined()
  })

  it('takes typed text for an option field with no values to list', () => {
    const promoter = field.option('city', { label: 'Promoter' })
    expect(labels(valueSuggestions(promoter, '', context()))).toEqual([[]])
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
    ).toEqual([['Yes', 'No']])
  })

  it('offers upcoming dates for events and recent ones for timestamps', () => {
    const starts = valuesOf(valueSuggestions(byKey('starts'), '', context()))
    expect(starts!.label).toBe('Starts')
    expect(starts!.items.slice(0, 3).map((item) => item.label)).toEqual([
      'Today',
      'Tomorrow',
      'This weekend'
    ])
    expect(starts!.items.at(-1)!.label).toBe('Past')
    const placed = valuesOf(valueSuggestions(byKey('placed'), '', context()))
    expect(placed!.items[1]!.label).toBe('Yesterday')
  })

  it('lists nothing under a calendar’s condition until a date is typed', () => {
    const listed = (text: string, operator: ValueOperator) =>
      labels(valueSuggestions(byKey('starts'), text, context(), operator))[0]
    expect(listed('', 'on')).toEqual([])
    expect(listed('', 'between')).toEqual([])
    expect(listed('fri', 'before')![0]).toBe('Fri')
  })

  it('suggests days under is, is before, and is after, named as typed with their date', () => {
    const group = valuesOf(
      valueSuggestions(byKey('starts'), 'next fri', context(), 'after')
    )
    expect(group!.items[0]).toMatchObject({
      label: 'Next Fri',
      description: 'Fri 9 Oct 2026',
      value: {
        type: 'filter',
        filter: { field: 'starts', operator: 'after', value: '2026-10-09' }
      }
    })
  })

  it('reads a typed range under is between, either way it’s joined', () => {
    for (const typed of ['22 oct to 30 oct', '22 oct and 30 oct']) {
      const group = valuesOf(
        valueSuggestions(byKey('starts'), typed, context(), 'between')
      )
      expect(group!.items[0]).toMatchObject({
        label: '22 to 30 Oct',
        value: {
          type: 'filter',
          filter: {
            field: 'starts',
            operator: 'between',
            value: ['2026-10-22', '2026-10-30']
          }
        }
      })
    }
    expect(
      labels(valueSuggestions(byKey('starts'), 'fri', context(), 'between'))
    ).toEqual([[]])
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

  it('lists the presets whose label holds every typed word', () => {
    const typed = (text: string) =>
      valuesOf(valueSuggestions(byKey('starts'), text, context())).items.map(
        (item) => item.label
      )
    expect(typed('next')).toEqual([
      'Next week',
      'Next month',
      'Next 7 days',
      'Next 30 days',
      'Next quarter',
      'Next year',
      'Next financial year'
    ])
    expect(typed('days next')).toEqual(['Next 7 days', 'Next 30 days'])
    expect(typed('next 7')[0]).toBe('Next 7 days')
  })

  it('lists a preset holding the typed word whole before one it only starts', () => {
    const typed = valuesOf(valueSuggestions(byKey('starts'), 'week', context()))
      .items.map((item) => item.label)
      .slice(0, 3)
    expect(typed).toEqual(['This week', 'Next week', 'This weekend'])
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

  it('offers nothing until something is typed', () => {
    expect(labels(valueSuggestions(byKey('name'), '', context()))).toEqual([[]])
    expect(labels(valueSuggestions(byKey('sold'), '', context()))).toEqual([[]])
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
    [
      'sold',
      '50-20',
      'between',
      { field: 'sold', operator: 'between', value: [20, 50] }
    ],
    [
      'sold',
      '-5 to -10',
      'between',
      { field: 'sold', operator: 'between', value: [-10, -5] }
    ],
    ['sold', '50-', 'between', undefined],
    [
      'sold',
      '20 and 50',
      'between',
      { field: 'sold', operator: 'between', value: [20, 50] }
    ],
    [
      'gross',
      '$1,000 AND $20',
      'between',
      { field: 'gross', operator: 'between', value: [20, 1000] }
    ],
    ['sold', '20 and', 'between', undefined],
    ['sold', '20 and 50', 'eq', undefined],
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

  it('ticks the typed row a number chip holds, leaving no text once taken', () => {
    const edited: RecordFilter = { field: 'sold', operator: 'gt', value: 100 }
    const [row] = valuesOf(
      valueSuggestions(byKey('sold'), '100', context(), 'gt', edited)
    ).items
    expect(row).toMatchObject({ selected: true })
    expect(row!.remainder).toBeUndefined()
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

  it('lists only the emptiness row under emptiness, not a held value', () => {
    const edited: RecordFilter = {
      field: 'city',
      operator: 'is',
      values: ['darwin']
    }
    expect(
      labels(
        valueSuggestions(byKey('city'), '', context(), 'is-not-set', edited)
      )
    ).toEqual([['City is empty']])
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

  it('ticks the emptiness row, a boolean answer, or a date preset the filter is', () => {
    expect(
      tickedIn(
        valueSuggestions(byKey('city'), '', context(), 'is-not-set', {
          field: 'city',
          operator: 'is-not-set'
        })
      )
    ).toEqual(['City is empty'])
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
        label: 'Starts is this weekend',
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
      label: 'Starts is this weekend',
      locked: true
    })
    expect(filter).not.toHaveProperty('description')
  })
})

describe('valueOperators', () => {
  it('toggles an option field between is and is not, plus has all when it holds several', () => {
    expect(valueOperators(byKey('city'))).toEqual([
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' },
      { value: 'is-not-set', label: 'is empty' },
      { value: 'is-set', label: 'is not empty' }
    ])
    expect(
      valueOperators({ ...byKey('city'), multiple: true }).map(
        (operator) => operator.value
      )
    ).toEqual(['is', 'is-not', 'has-all', 'is-not-set', 'is-set'])
  })

  it('gives a boolean field is, then emptiness', () => {
    expect(valueOperators(byKey('accessible'))).toEqual([
      { value: 'is', label: 'is' },
      { value: 'is-not-set', label: 'is empty' },
      { value: 'is-set', label: 'is not empty' }
    ])
  })

  it('gives a date field is relative, the calendar’s conditions, then emptiness', () => {
    expect(valueOperators(byKey('starts'))).toEqual([
      { value: 'within', label: 'is relative' },
      { value: 'on', label: 'is' },
      { value: 'before', label: 'is before' },
      { value: 'after', label: 'is after' },
      { value: 'between', label: 'is between' },
      { value: 'is-not-set', label: 'is empty' },
      { value: 'is-set', label: 'is not empty' }
    ])
  })

  it('offers only quick dates to a date field that can’t filter by its dates', () => {
    const dates = field.date('starts', { label: 'Dates', multiple: true })
    expect(stepOperator(dates, 'is-set')).toBe('within')
    expect(valueOperators(dates)).toEqual([])
  })

  it('toggles a text field between contains, doesn’t contain, is and is not', () => {
    expect(valueOperators(byKey('name'))).toEqual([
      { value: 'contains', label: 'contains' },
      { value: 'not-contains', label: 'doesn’t contain' },
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' },
      { value: 'is-not-set', label: 'is empty' },
      { value: 'is-set', label: 'is not empty' }
    ])
  })

  it('shows a number’s operators as symbols, named in words, and emptiness in words', () => {
    expect(valueOperators(byKey('gross'))).toEqual([
      { value: 'eq', label: '=', 'aria-label': 'is' },
      { value: 'neq', label: '≠', 'aria-label': 'is not' },
      { value: 'lt', label: '<', 'aria-label': 'is less than' },
      { value: 'gt', label: '>', 'aria-label': 'is more than' },
      { value: 'between', label: 'between', 'aria-label': 'is between' },
      { value: 'is-not-set', label: 'is empty' },
      { value: 'is-set', label: 'is not empty' }
    ])
  })
})

describe('stepOperator', () => {
  it('keeps an operator the field’s step offers, or starts on its first', () => {
    expect(stepOperator(byKey('name'), 'is-not')).toBe('is-not')
    expect(stepOperator(byKey('name'), 'is-not-set')).toBe('is-not-set')
    expect(stepOperator(byKey('name'), 'has-all')).toBe('contains')
    expect(stepOperator(byKey('accessible'), 'is-set')).toBe('is-set')
    expect(stepOperator(byKey('sold'), 'gt')).toBe('gt')
    expect(stepOperator(byKey('sold'), 'contains')).toBe('eq')
    expect(stepOperator(byKey('city'), 'has-all')).toBe('is')
    expect(stepOperator(byKey('starts'), 'between')).toBe('between')
    expect(stepOperator(byKey('starts'), 'within')).toBe('within')
    expect(stepOperator(byKey('starts'), '')).toBe('within')
  })
})

describe('pendingLabel', () => {
  it('reads the field and its operator in words', () => {
    expect(pendingLabel(byKey('name'), 'not-contains')).toBe(
      'Event doesn’t contain'
    )
    expect(pendingLabel(byKey('sold'), 'lt')).toBe('Sold is less than')
    expect(pendingLabel(byKey('starts'), 'within')).toBe('Starts is relative')
    expect(pendingLabel(byKey('starts'), 'on')).toBe('Starts is')
    expect(pendingLabel(byKey('starts'), 'before')).toBe('Starts is before')
    expect(pendingLabel(byKey('accessible'), 'is')).toBe('Accessible is')
    expect(pendingLabel(byKey('starts'), 'is-not-set')).toBe('Starts is empty')
    expect(pendingLabel(byKey('sold'), 'is-set')).toBe('Sold is not empty')
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
      '20 and 50'
    ],
    [
      'a reversed range',
      { field: 'gross', operator: 'between', value: [50, 20] },
      '20 and 50'
    ],
    ['emptiness', { field: 'name', operator: 'is-set' }, ''],
    ['an option', { field: 'city', operator: 'is', values: ['perth'] }, '']
  ])('prefills %s as typed', (_, filter, text) => {
    expect(valueText(byKey(filter.field), filter, context())).toBe(text)
  })

  it.each<[string, RecordFilter, string]>([
    [
      'a day',
      { field: 'starts', operator: 'on', value: '2026-10-22' },
      '22 Oct'
    ],
    [
      'a day last year',
      { field: 'starts', operator: 'before', value: '2025-09-14' },
      '14 Sep 2025'
    ],
    [
      'a day next year',
      { field: 'starts', operator: 'after', value: '2027-02-26' },
      '26 Feb'
    ],
    [
      'a range',
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-11-12', '2026-12-15']
      },
      '12 Nov to 15 Dec'
    ],
    [
      'a range across years',
      {
        field: 'starts',
        operator: 'between',
        value: ['2025-12-28', '2026-01-03']
      },
      '28 Dec 2025 to 3 Jan 2026'
    ],
    [
      'a quick date',
      { field: 'starts', operator: 'within', value: 'this-week' },
      'This week'
    ],
    [
      'a quick span',
      {
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 30, unit: 'day' }
      },
      'Next 30 days'
    ],
    [
      'upcoming',
      { field: 'starts', operator: 'within', value: 'upcoming' },
      'Upcoming'
    ]
  ])('prefills %s as text that reads back to it', (_, filter, text) => {
    const starts = byKey('starts')
    const typed = valueText(starts, filter, context())
    expect(typed).toBe(text)
    const operator = stepOperator(starts, filter.operator)
    expect(
      valueSuggestions(starts, typed, context(), operator, filter)
        .flatMap((group) => group.items)
        .filter((item) => item.selected)
    ).toHaveLength(1)
  })
})

describe('valueHint', () => {
  it.each<[string, string, ValueOperator, string | undefined]>([
    ['name', '', 'contains', 'Type the text to match.'],
    ['name', 'disco', 'contains', undefined],
    ['sold', '', 'eq', 'Type a number.'],
    ['sold', '>50', 'eq', 'Type a number like 50.'],
    ['sold', 'lots', 'lt', 'Type a number like 50.'],
    ['sold', '50', 'gt', undefined],
    ['gross', '', 'neq', 'Type an amount.'],
    ['gross', 'lots', 'eq', 'Type an amount like $50.'],
    ['sold', '', 'between', 'Type two numbers like 20 and 50.'],
    ['sold', '2', 'between', 'Between 2 and what? Type the second number.'],
    [
      'sold',
      '2 and ',
      'between',
      'Between 2 and what? Type the second number.'
    ],
    ['sold', '2-', 'between', 'Between 2 and what? Type the second number.'],
    ['sold', 'lots', 'between', 'Type two numbers like 20 and 50.'],
    ['sold', '2 and 7', 'between', undefined],
    ['gross', '', 'between', 'Type two amounts like $20 and $50.'],
    [
      'gross',
      '$1,000 ',
      'between',
      'Between $1,000 and what? Type the second amount.'
    ],
    ['city', '', 'is', undefined],
    ['name', '', 'is-not-set', undefined],
    ['sold', 'lots', 'is-set', undefined],
    ['accessible', '', 'is', undefined]
  ])('hints at %s “%s” under %s', (key, text, operator, hint) => {
    expect(valueHint(byKey(key), text, operator, context())).toBe(hint)
  })
})

describe('withAnd', () => {
  it.each<[string, string, string, ValueOperator, string]>([
    ['sold', '2', '2 ', 'between', '2 and '],
    ['gross', '$1,000', '$1,000 ', 'between', '$1,000 and '],
    ['sold', '2', '2 ', 'eq', '2 '],
    ['sold', '', ' ', 'between', ' '],
    ['sold', '2 ', '2  ', 'between', '2  '],
    ['sold', '2 a', '2 ', 'between', '2 '],
    ['sold', '', '2 ', 'between', '2 '],
    ['sold', '2-', '2- ', 'between', '2- '],
    ['sold', 'lots', 'lots ', 'between', 'lots '],
    ['sold', '2 and ', '2 and 7', 'between', '2 and 7'],
    ['sold', '2', '3 ', 'between', '3 '],
    ['sold', '2 and ', '2 and a', 'between', '2 a'],
    ['sold', '2 and ', '2 and t', 'between', '2 t'],
    ['sold', '2 and ', '2 and -', 'between', '2 and -'],
    ['sold', 'lots and ', 'lots and a', 'between', 'lots and a'],
    ['sold', '2 and ', '2 and a', 'eq', '2 and a'],
    ['sold', '20 and ', '20 and', 'between', '20'],
    ['gross', '$20 and ', '$20 and', 'between', '$20'],
    ['sold', '20 and', '20 an', 'between', '20 an'],
    ['sold', 'lots and ', 'lots and', 'between', 'lots and'],
    ['sold', '20 and ', '20 and', 'eq', '20 and']
  ])('types %s “%s” to “%s” under %s', (key, before, after, operator, text) => {
    expect(withAnd(byKey(key), before, after, operator, context())).toBe(text)
  })
})

describe('rulesOut', () => {
  const empty: RecordFilter = { field: 'city', operator: 'is-not-set' }
  const set: RecordFilter = { field: 'city', operator: 'is-set' }
  const perth: RecordFilter = {
    field: 'city',
    operator: 'is',
    values: ['perth']
  }
  const sold: RecordFilter = { field: 'sold', operator: 'eq', value: 20 }

  it('rules out anything else on a field beside is empty, either way round', () => {
    expect(rulesOut(empty, perth)).toBe(true)
    expect(rulesOut(perth, empty)).toBe(true)
    expect(rulesOut(empty, set)).toBe(true)
  })

  it('rules out a field’s other date filter, either way round', () => {
    const weekend: RecordFilter = {
      field: 'starts',
      operator: 'within',
      value: 'this-weekend'
    }
    const after: RecordFilter = {
      field: 'starts',
      operator: 'after',
      value: '2026-12-01'
    }
    const between: RecordFilter = {
      field: 'starts',
      operator: 'between',
      value: ['2026-10-20', '2026-10-23']
    }
    expect(rulesOut(weekend, after)).toBe(true)
    expect(rulesOut(between, weekend)).toBe(true)
    expect(rulesOut({ ...after, operator: 'on' }, between)).toBe(true)
    expect(rulesOut(weekend, { ...after, operator: 'before' })).toBe(true)
    expect(rulesOut(after, { ...after, field: 'placed' })).toBe(false)
    expect(rulesOut(after, { field: 'starts', operator: 'is-set' })).toBe(false)
  })

  it('keeps a number’s ranges side by side', () => {
    expect(
      rulesOut(
        { field: 'sold', operator: 'between', value: [10, 50] },
        { field: 'sold', operator: 'between', value: [20, 80] }
      )
    ).toBe(false)
  })

  it('keeps is not empty beside values, other fields, and the same filter', () => {
    expect(rulesOut(set, perth)).toBe(false)
    expect(rulesOut(empty, sold)).toBe(false)
    expect(rulesOut(empty, { ...empty })).toBe(false)
  })
})

describe('heldHint', () => {
  const suburbs = field.option('city', {
    label: 'Suburb',
    options: [
      { value: 'north-perth', label: 'North Perth' },
      { value: 'perth', label: 'Perth' },
      { value: 'south-perth', label: 'South Perth' },
      { value: 'fremantle', label: 'Fremantle' },
      { value: 'north-beach', label: 'North Beach' }
    ]
  })
  const hintFor = (text: string, values: string[]) => {
    const edited: RecordFilter = { field: 'city', operator: 'is', values }
    const groups = valueSuggestions(
      suburbs,
      text,
      { ...context(), fields: [suburbs] },
      'is',
      edited
    )
    return heldHint(suburbs, text, groups)
  }

  it('names the held values the text matches, with an Oxford comma', () => {
    const all = ['north-perth', 'perth', 'south-perth']
    expect(hintFor('frem', ['fremantle'])).toBe(
      'Fremantle is already in this filter.'
    )
    expect(hintFor('perth', all)).toBe(
      'Perth, North Perth, and South Perth are already in this filter.'
    )
    expect(hintFor('north', ['north-perth', 'north-beach'])).toBe(
      'North Perth and North Beach are already in this filter.'
    )
  })

  // Enter replaces a typed value, so a held one still has something to do.
  it('says nothing for a typed field', () => {
    const sold = byKey('sold')
    const edited: RecordFilter = { field: 'sold', operator: 'eq', value: 20 }
    const groups = valueSuggestions(sold, '20', context(), 'eq', edited)
    expect(groups[0]!.items[0]!.selected).toBe(true)
    expect(heldHint(sold, '20', groups)).toBeUndefined()
  })

  it('says nothing while a match is new, or nothing is typed', () => {
    expect(hintFor('perth', ['perth'])).toBeUndefined()
    expect(hintFor('', ['perth'])).toBeUndefined()
  })
})
