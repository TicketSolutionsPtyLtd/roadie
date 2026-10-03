import { describe, expect, it } from 'vitest'

import { type RecordSuggestion, parseQuery } from './parse'
import { eventFields } from './testFields'

const options = {
  fields: eventFields,
  // Midday Saturday 3 October 2026 in Sydney.
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
}

const parse = (text: string, extra: { limit?: number; entity?: string } = {}) =>
  parseQuery(text, { ...options, ...extra })

const summary = (s: RecordSuggestion) =>
  s.kind === 'field' ? `field ${s.value.field}` : s.label

describe('parseQuery', () => {
  it('lists filterable fields when nothing is typed', () => {
    const result = parse('  ')
    expect(result.every((s) => s.kind === 'field')).toBe(true)
    expect(result.map((s) => s.value)).toEqual(
      eventFields
        .filter((f) => f.filterable !== false)
        .map((f) => ({ field: f.key }))
        .slice(0, 10)
    )
  })

  it('finds an identifier among other words', () => {
    const [first] = parse('oz-12345 velvet')
    expect(first).not.toHaveProperty('exact')
    expect(first).toMatchObject({
      kind: 'filter',
      remainder: 'velvet',
      value: { field: 'orderNumber', operator: 'is', values: ['oz-12345'] }
    })
  })

  it('takes an identifier as an exact match, first', () => {
    const [first] = parse('oz-12345')
    expect(first).toMatchObject({
      kind: 'filter',
      label: 'Order number is oz-12345',
      exact: true,
      remainder: '',
      value: { field: 'orderNumber', operator: 'is', values: ['oz-12345'] }
    })
  })

  it('marks nothing else exact', () => {
    expect(parse('melb').some((s) => s.kind === 'filter' && s.exact)).toBe(
      false
    )
  })

  it.each([
    [
      'melb',
      'City is Melbourne',
      { field: 'city', operator: 'is', values: ['melbourne'] }
    ],
    [
      'velvet',
      'Venue is The Velvet Room',
      { field: 'venue', operator: 'is', values: ['velvet-room'] }
    ],
    [
      'selling',
      'Status is Selling fast',
      { field: 'status', operator: 'is', values: ['selling_fast'] }
    ],
    [
      'sold out',
      'Status is Sold out',
      { field: 'status', operator: 'is', values: ['sold_out'] }
    ],
    [
      'jazz',
      'Genres is Jazz',
      { field: 'genres', operator: 'is', values: ['jazz'] }
    ],
    ['featured', 'Featured is true', { field: 'featured', operator: 'is-true' }]
  ])('reads "%s" as a value: %s', (text, label, value) => {
    expect(parse(text)[0]).toMatchObject({ kind: 'filter', label, value })
  })

  it('suggests a field from part of its name', () => {
    expect(parse('ven')[0]).toMatchObject({
      kind: 'field',
      label: 'Venue',
      value: { field: 'venue' }
    })
    expect(parse('capa').map(summary)).toContain('field capacity')
  })

  it('reads a date phrase for every date field, the first field first', () => {
    const result = parse('this weekend').filter((s) => s.kind === 'filter')
    expect(result.map((s) => s.label)).toEqual([
      'Starts: This weekend',
      'On sale: This weekend',
      'Created: This weekend',
      'Birthday: This weekend'
    ])
    expect(result[0]).toMatchObject({
      value: { field: 'starts', operator: 'within', value: 'this-weekend' },
      description: '3 to 4 Oct 2026'
    })
  })

  it.each([
    ['14 mar', { field: 'starts', operator: 'on', value: '2027-03-14' }],
    [
      'after 1 dec',
      { field: 'starts', operator: 'after', value: '2026-12-01' }
    ],
    [
      'before 1 dec',
      { field: 'starts', operator: 'before', value: '2026-12-01' }
    ],
    [
      '1 to 14 mar',
      {
        field: 'starts',
        operator: 'between',
        value: ['2027-03-01', '2027-03-14']
      }
    ],
    [
      'next 7 days',
      {
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 7, unit: 'day' }
      }
    ]
  ])('reads "%s" as a date filter', (text, value) => {
    expect(parse(text)[0]!.value).toEqual(value)
  })

  it('offers no hour windows on a plain date field', () => {
    const hourFields = parse('next 6 hours', { limit: 50 })
      .filter(
        (s) =>
          s.kind === 'filter' &&
          s.value.operator === 'within' &&
          typeof s.value.value === 'object' &&
          'unit' in s.value.value &&
          s.value.value.unit === 'hour'
      )
      .map((s) => s.value.field)
    expect(hourFields).toContain('starts')
    expect(hourFields).not.toContain('birthday')
  })

  it('ignores a bare time', () => {
    expect(parse('7:30pm')).toEqual([])
  })

  it('suggests nothing for text it cannot read', () => {
    expect(parse('xyzzy')).toEqual([])
  })

  it('reads each part of a phrase and keeps the rest as remainder', () => {
    const result = parse('melb this weekend')
    expect(result.slice(0, 2).map((s) => [s.label, s.remainder])).toEqual([
      ['Starts: This weekend', 'melb'],
      ['City is Melbourne', 'this weekend']
    ])
  })

  describe('field:value', () => {
    it.each([
      [
        'venue:velvet',
        'Venue is The Velvet Room',
        { field: 'venue', operator: 'is', values: ['velvet-room'] }
      ],
      [
        'City: syd',
        'City is Sydney',
        { field: 'city', operator: 'is', values: ['sydney'] }
      ],
      [
        'name:neon',
        'Name contains "neon"',
        { field: 'name', operator: 'contains', value: 'neon' }
      ],
      [
        'capacity:>100',
        'Capacity is more than 100',
        { field: 'capacity', operator: 'gt', value: 100 }
      ],
      [
        'capacity:<100',
        'Capacity is less than 100',
        { field: 'capacity', operator: 'lt', value: 100 }
      ],
      [
        'capacity:100',
        'Capacity is 100',
        { field: 'capacity', operator: 'eq', value: 100 }
      ],
      [
        'capacity:!=100',
        'Capacity is not 100',
        { field: 'capacity', operator: 'neq', value: 100 }
      ],
      [
        'gross:100-500.5',
        'Gross is 100 to 500.5',
        { field: 'gross', operator: 'between', value: [100, 500.5] }
      ],
      [
        'featured:no',
        'Featured is false',
        { field: 'featured', operator: 'is-false' }
      ],
      [
        'starts:this weekend',
        'Starts: This weekend',
        { field: 'starts', operator: 'within', value: 'this-weekend' }
      ],
      [
        'order number:OZ-55555',
        'Order number is OZ-55555',
        { field: 'orderNumber', operator: 'is', values: ['OZ-55555'] }
      ]
    ])('reads %s', (text, label, value) => {
      const result = parse(text)
      expect(result[0]).toMatchObject({
        kind: 'filter',
        label,
        value,
        remainder: ''
      })
      expect(result.every((s) => s.value.field === value.field)).toBe(true)
    })

    it('offers the field itself with no value yet', () => {
      expect(parse('venue:')).toMatchObject([
        { kind: 'field', value: { field: 'venue' } }
      ])
    })

    it('reads an unknown prefix as ordinary text', () => {
      expect(parse('nope:velvet')).toEqual([])
    })
  })

  it('stops at the limit, best first', () => {
    const result = parse('', { limit: 3 })
    expect(result).toHaveLength(3)
    const scores = parse('s').map((s) => s.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('gives every suggestion a unique, stable id', () => {
    const ids = parse('melb this weekend').map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(parse('melb this weekend').map((s) => s.id)).toEqual(ids)
  })

  it('fits the shape QueryField renders', () => {
    type QueryFieldSuggestionShape = {
      id: string
      label: string
      description?: string
      kind: 'filter' | 'field' | 'record'
      value: unknown
      exact?: boolean
    }
    const shaped: QueryFieldSuggestionShape[] = parse('melb')
    expect(shaped.length).toBeGreaterThan(0)
  })

  it('ranks a completed phrase below one typed in full', () => {
    const [week] = parse('this')
    const [weekend] = parse('this weekend')
    expect(week!.label).toBe('Starts: This week')
    expect(week!.score).toBeLessThan(weekend!.score)
  })

  it('tags suggestions with an entity, so several entities can merge', () => {
    const events = parse('status', { entity: 'events' })
    const orders = parse('status', { entity: 'orders' })
    expect(events[0]).toMatchObject({
      entity: 'events',
      id: 'events:field:status'
    })
    const merged = [...events, ...orders].map((s) => s.id)
    expect(new Set(merged).size).toBe(merged.length)
  })

  it.each(['capacity:' + '9'.repeat(309), 'capacity:1-' + '9'.repeat(309)])(
    'offers nothing for a number too large to hold',
    (text) => {
      expect(parse(text)).toEqual([])
    }
  )

  it('completes a phrase whose label differs from its words only at the end', () => {
    expect(parse('ongo melb').map((s) => s.label)).not.toContain(
      'Starts: Happening now'
    )
    const [ongoing] = parse('ongo')
    const [exact] = parse('ongoing')
    expect(ongoing!.label).toBe('Starts: Happening now')
    expect(ongoing!.score).toBeLessThan(exact!.score)
  })

  it('leaves out a date field that holds a list', () => {
    const fields = [
      ...eventFields,
      {
        key: 'sessions',
        label: 'Sessions',
        type: 'date' as const,
        multiple: true
      }
    ]
    const read = (text: string) =>
      parseQuery(text, { ...options, fields, limit: 50 }).map(
        (s) => s.value.field
      )
    expect(read('')).not.toContain('sessions')
    expect(read('today')).not.toContain('sessions')
    expect(read('sessions:today')).toEqual([])
  })

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'leaves %s as free text instead of throwing',
    (text) => {
      expect(() => parse(text)).not.toThrow()
      expect(parse(text).filter((s) => s.kind === 'filter')).toEqual([])
    }
  )

  it.each(['next 2 constructors', 'next 2 __proto__s', 'constructor 14'])(
    'reads %s without taking an inherited name as a unit or month',
    (text) => {
      expect(() => parse(text)).not.toThrow()
      expect(parse(text).map((s) => s.remainder)).not.toContain('')
    }
  )

  it('keeps every score between 0 and 1, however many date fields', () => {
    const fields = Array.from({ length: 30 }, (_, i) => ({
      key: `date${i}`,
      label: `Date ${i}`,
      type: 'date' as const
    }))
    const scores = parseQuery('this weekend', {
      ...options,
      fields,
      limit: 100
    }).map((s) => s.score)
    expect(scores).toHaveLength(30)
    expect(scores.every((score) => score > 0 && score <= 1)).toBe(true)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})
