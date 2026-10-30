import { describe, expect, it } from 'vitest'

import { describeRecordFilter } from './describe'
import { type RecordSuggestion, parseRecordQuery } from './parse'
import { eventFields } from './testFields'

const options = {
  fields: eventFields,
  // Midday Saturday 3 October 2026 in Sydney.
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
}

const parse = (text: string, extra: { limit?: number; entity?: string } = {}) =>
  parseRecordQuery(text, { ...options, ...extra })

const summary = (s: RecordSuggestion) =>
  s.kind === 'field' ? `field ${s.value.field}` : s.label

// A number field whose name starts a status value, "Sold out".
const soldFields = [
  ...eventFields,
  { key: 'sold', label: 'Sold', type: 'number' as const }
]

const readSold = (text: string, fields = soldFields) =>
  parseRecordQuery(text, { ...options, fields, limit: 50 }).map(summary)

describe('parseRecordQuery', () => {
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
    const [first] = parse('oz-12345 quilted')
    expect(first).not.toHaveProperty('exact')
    expect(first).toMatchObject({
      kind: 'filter',
      remainder: 'quilted',
      value: { field: 'orderNumber', operator: 'is', values: ['oz-12345'] }
    })
  })

  it('says which field holds a pattern it cannot read', () => {
    const fields = [
      { key: 'code', label: 'Code', type: 'text' as const, match: '^($' }
    ]
    expect(() => parseRecordQuery('abc', { ...options, fields })).toThrow(
      /"Code" match is not a valid pattern/
    )
  })

  it.each([
    ['an alternative', '^OZ-1|OZ-2$', 'Order OZ-2'],
    ['an escaped dollar', '^OZ-\\d+\\$', 'OZ-12$ off']
  ])('matches whole text only, with %s in the pattern', (_, match, text) => {
    const fields = [
      { key: 'code', label: 'Code', type: 'text' as const, match }
    ]
    expect(
      parseRecordQuery(text, { ...options, fields }).map((s) => s.label)
    ).not.toContain(`Code is ${text}`)
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
      'City is in Melbourne',
      { field: 'city', operator: 'is', values: ['melbourne'] }
    ],
    [
      'walrus',
      'Venue is The Quilted Walrus Room',
      { field: 'venue', operator: 'is', values: ['quilted-walrus-room'] }
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
    ['featured', 'Featured is Yes', { field: 'featured', operator: 'is-true' }]
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

  it('ranks a field its name matches exactly above a value it starts', () => {
    expect(readSold('sold').slice(0, 2)).toEqual([
      'field sold',
      'Status is Sold out'
    ])
    expect(readSold('sol')[0]).toBe('Status is Sold out')
  })

  it('reads a date phrase for every date field, the first field first', () => {
    const result = parse('this weekend').filter((s) => s.kind === 'filter')
    expect(result.map((s) => s.label)).toEqual([
      'Starts is this weekend',
      'On sale is this weekend',
      'Created is this weekend',
      'Birthday is this weekend'
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

  it.each([
    'on the weekend',
    'shows on the weekend',
    'on weekend',
    'the weekend',
    'at the weekend',
    'weekend'
  ])('reads "%s" as this weekend, its words as nothing else', (text) => {
    const result = parse(text, { limit: 50 })
    expect(result[0]).toMatchObject({
      label: 'Starts is this weekend',
      value: { field: 'starts', operator: 'within', value: 'this-weekend' }
    })
    expect(result.map(summary)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(Status|Venue) is |^field onSale$/)
      ])
    )
  })

  it.each([
    ['rest of the week', ['2026-10-03', '2026-10-04']],
    ['rest of month', ['2026-10-03', '2026-10-31']]
  ])('reads "%s" from today to the end, never to date', (text, value) => {
    const result = parse(text, { limit: 50 })
    expect(result[0]!.value).toEqual({
      field: 'starts',
      operator: 'between',
      value
    })
    expect(result.map(summary).join()).not.toMatch(/to date/i)
  })

  it.each([
    ['week', 'this-week'],
    ['month', 'this-month']
  ])('offers this period first for "%s"', (text, value) => {
    expect(parse(text)[0]!.value).toEqual({
      field: 'starts',
      operator: 'within',
      value
    })
  })

  it.each([
    ['tmrw', 'tomorrow'],
    ['tomorow', 'tomorrow'],
    ['tonight', 'today']
  ])('reads "%s" as %s', (text, value) => {
    expect(parse(text)[0]!.value).toEqual({
      field: 'starts',
      operator: 'within',
      value
    })
  })

  it('describes both readings of next weekend, as this weekend has one', () => {
    expect(
      parse('next weekend')
        .filter((s) => s.kind === 'filter' && s.value.field === 'starts')
        .map((s) => [s.label, s.description])
    ).toEqual([
      ['Starts is 10 to 11 Oct', 'Next weekend'],
      ['Starts is this weekend', '3 to 4 Oct 2026']
    ])
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
      ['Starts is this weekend', 'melb'],
      ['City is in Melbourne', 'this weekend']
    ])
  })

  describe('values at word starts', () => {
    const fields = [
      ...eventFields,
      {
        key: 'room',
        label: 'Room',
        type: 'option' as const,
        options: [
          { value: 'nimbus', label: 'Nimbus Thistle Hall' },
          { value: 'lantern', label: 'Perth Lantern Hall' },
          { value: 'opal', label: 'Opal Harpoon Room (Upstairs)' },
          { value: 'teacup', label: 'Wobbly Teacup Room/Lawn' },
          { value: 'kazoo', label: 'Kazoo Hollow Perth' },
          { value: 'echidna', label: 'Echidna Gaslight Theatre' }
        ]
      }
    ]
    const read = (text: string) =>
      parseRecordQuery(text, { ...options, fields, limit: 50 }).map(summary)

    it.each([
      ['this', 'Room is Nimbus Thistle Hall'],
      ['thistle hall', 'Room is Nimbus Thistle Hall'],
      ['walrus room', 'Venue is The Quilted Walrus Room'],
      ['per', 'City is in Perth'],
      ['upstairs', 'Room is Opal Harpoon Room (Upstairs)'],
      ['lawn', 'Room is Wobbly Teacup Room/Lawn']
    ])('reads "%s" from the start of a word: %s', (text, label) => {
      expect(
        parseRecordQuery(text, { ...options, fields }).map((s) => [
          s.label,
          s.remainder
        ])
      ).toContainEqual([label, ''])
    })

    it.each([
      ['elb', 'City is in Melbourne'],
      ['istle', 'Room is Nimbus Thistle Hall'],
      ['uilted', 'Venue is The Quilted Walrus Room']
    ])('reads nothing from inside a word in "%s"', (text, label) => {
      expect(read(text)).not.toContain(label)
    })

    it('reads no partial value inside a longer reading', () => {
      const result = read('melb this weekend')
      expect(result.slice(0, 2)).toEqual([
        'Starts is this weekend',
        'City is in Melbourne'
      ])
      expect(result).not.toContain('Room is Nimbus Thistle Hall')
      expect(read('starts this weekend')).not.toContain(
        'Room is Nimbus Thistle Hall'
      )
    })

    it.each([
      ['in the next 7 days', 'Starts is in the next 7 days'],
      ['in the next week', 'Starts is next week'],
      ['the 20th of oct', 'Starts is on Tue 20 Oct']
    ])('reads "%s" as a date, and "the" as no value', (text, label) => {
      const result = read(text)
      expect(result[0]).toBe(label)
      expect(result).not.toContain('Room is Echidna Gaslight Theatre')
      expect(result).not.toContain('Venue is The Quilted Walrus Room')
    })

    it('reads no value from the words of a negated date phrase', () => {
      expect(read('not this weekend')).not.toContain(
        'Room is not Nimbus Thistle Hall'
      )
    })

    it('keeps a value named in full inside a longer reading', () => {
      expect(read('perth lantern')).toEqual(
        expect.arrayContaining([
          'Room is Perth Lantern Hall',
          'City is in Perth'
        ])
      )
    })

    it('reads an option value to the end past words other filters read', () => {
      expect(
        parseRecordQuery('room kazoo hollow perth', { ...options, fields })[0]
      ).toMatchObject({ label: 'Room is Kazoo Hollow Perth', remainder: '' })
    })

    it('keeps a partial value inside text a field contains', () => {
      expect(
        parse('name disco melb', { limit: 50 }).map((s) => [
          s.label,
          s.remainder
        ])
      ).toContainEqual(['City is in Melbourne', 'name disco'])
      expect(
        parse('name not disco melb', { limit: 50 }).map((s) => [
          s.label,
          s.remainder
        ])
      ).toContainEqual(['City is in Melbourne', 'name not disco'])
    })
  })

  describe('field:value', () => {
    it.each([
      [
        'venue:quilted',
        'Venue is The Quilted Walrus Room',
        { field: 'venue', operator: 'is', values: ['quilted-walrus-room'] }
      ],
      [
        'City: syd',
        'City is in Sydney',
        { field: 'city', operator: 'is', values: ['sydney'] }
      ],
      [
        'name:lampshade',
        'Name contains “lampshade”',
        { field: 'name', operator: 'contains', value: 'lampshade' }
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
        'Gross is $100 to $500.50',
        { field: 'gross', operator: 'between', value: [100, 500.5] }
      ],
      [
        'gross:$1,500',
        'Gross is $1,500',
        { field: 'gross', operator: 'eq', value: 1500 }
      ],
      [
        'gross:>$2,000',
        'Gross is more than $2,000',
        { field: 'gross', operator: 'gt', value: 2000 }
      ],
      [
        'capacity:1,000-2,500',
        'Capacity is 1,000 to 2,500',
        { field: 'capacity', operator: 'between', value: [1000, 2500] }
      ],
      [
        'featured:no',
        'Featured is No',
        { field: 'featured', operator: 'is-false' }
      ],
      [
        'starts:this weekend',
        'Starts is this weekend',
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

    it.each(['capacity:1,2', 'capacity:1$2', 'capacity:12,34'])(
      'reads nothing from a misplaced comma or dollar sign in %s',
      (text) => {
        expect(parse(text).filter((s) => s.kind === 'filter')).toEqual([])
      }
    )

    it('names a field whose label holds a colon', () => {
      const fields = [
        ...eventFields,
        { key: 'doors', label: 'Doors: main', type: 'number' as const }
      ]
      expect(
        parseRecordQuery('doors: main:>5', { ...options, fields })[0]
      ).toMatchObject({
        kind: 'filter',
        value: { field: 'doors', operator: 'gt', value: 5 }
      })
    })

    it('reads an unknown prefix as ordinary text', () => {
      expect(parse('nope:quilted')).toEqual([])
    })
  })

  describe('values joined by "or"', () => {
    const first = (text: string) => {
      const [top] = parse(text)
      return (
        top && { label: top.label, value: top.value, remainder: top.remainder }
      )
    }

    it.each([
      ['city melb or syd', 'is', ['melbourne', 'sydney']],
      ['melb or syd', 'is', ['melbourne', 'sydney']],
      ['city is melb or syd', 'is', ['melbourne', 'sydney']],
      ['city:melb or syd', 'is', ['melbourne', 'sydney']],
      ['melb or syd or perth', 'is', ['melbourne', 'sydney', 'perth']],
      ['not melb or syd', 'is-not', ['melbourne', 'sydney']],
      [
        'venue is not walrus or kettle',
        'is-not',
        ['quilted-walrus-room', 'antler-kettle-hall']
      ],
      ['jazz or folk', 'is', ['jazz', 'folk']]
    ])(
      'reads "%s" as one chip holding each value',
      (text, operator, values) => {
        expect(first(text)).toMatchObject({
          value: { operator, values },
          remainder: ''
        })
      }
    )

    it('labels the chip as it reads', () => {
      expect(first('city melb or syd')?.label).toBe(
        'City is in Melbourne or Sydney'
      )
    })

    it('keeps values joined by "and" as a chip each', () => {
      expect(first('city melb and syd')).toMatchObject({
        value: { values: ['melbourne'] },
        remainder: 'and syd'
      })
    })

    it('reads no chip when a value after "or" is another field\'s', () => {
      expect(first('melb or jazz')?.value).not.toMatchObject({
        values: ['melbourne', 'jazz']
      })
    })

    it('keeps the same value once', () => {
      expect(first('melb or melbourne')?.value).toMatchObject({
        values: ['melbourne']
      })
    })
  })

  describe('negation', () => {
    it.each([
      [
        '-melb',
        'City is not in Melbourne',
        { field: 'city', operator: 'is-not', values: ['melbourne'] }
      ],
      [
        'not melb',
        'City is not in Melbourne',
        { field: 'city', operator: 'is-not', values: ['melbourne'] }
      ],
      [
        "isn't sydney",
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'excluding walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        'except sold out',
        'Status is not Sold out',
        { field: 'status', operator: 'is-not', values: ['sold_out'] }
      ],
      [
        'without jazz',
        'Genres is not Jazz',
        { field: 'genres', operator: 'is-not', values: ['jazz'] }
      ],
      [
        'not featured',
        'Featured is No',
        { field: 'featured', operator: 'is-false' }
      ],
      [
        'venue is not walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        "Venue isn't walrus",
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        'venue isn’t walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        "name doesn't contain disco",
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'name does not contain disco',
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'name is not disco',
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'order number is not OZ-55555',
        'Order number is not OZ-55555',
        { field: 'orderNumber', operator: 'is-not', values: ['OZ-55555'] }
      ],
      [
        'capacity is not 100',
        'Capacity is not 100',
        { field: 'capacity', operator: 'neq', value: 100 }
      ],
      [
        'venue:!walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        'venue:-walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        'name:!lampshade',
        'Name doesn’t contain “lampshade”',
        { field: 'name', operator: 'not-contains', value: 'lampshade' }
      ],
      [
        'capacity:!100',
        'Capacity is not 100',
        { field: 'capacity', operator: 'neq', value: 100 }
      ],
      [
        'featured:!yes',
        'Featured is No',
        { field: 'featured', operator: 'is-false' }
      ],
      [
        'featured is not no',
        'Featured is Yes',
        { field: 'featured', operator: 'is-true' }
      ],
      [
        'capacity is not !=100',
        'Capacity is 100',
        { field: 'capacity', operator: 'eq', value: 100 }
      ],
      [
        'city:! melb',
        'City is not in Melbourne',
        { field: 'city', operator: 'is-not', values: ['melbourne'] }
      ],
      [
        'not OZ-55555',
        'Order number is not OZ-55555',
        { field: 'orderNumber', operator: 'is-not', values: ['OZ-55555'] }
      ],
      [
        '-sold out',
        'Status is not Sold out',
        { field: 'status', operator: 'is-not', values: ['sold_out'] }
      ],
      [
        'city != syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'city!=syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'venue ≠ walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        '!= syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        '≠ syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'city:!=syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'city:≠syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'city isnt sydney',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'isnt sydney',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ],
      [
        'excludes walrus',
        'Venue is not The Quilted Walrus Room',
        { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] }
      ],
      [
        'name doesnt contain disco',
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'name excludes disco',
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'name excluding disco',
        'Name doesn’t contain “disco”',
        { field: 'name', operator: 'not-contains', value: 'disco' }
      ],
      [
        'city excludes syd',
        'City is not in Sydney',
        { field: 'city', operator: 'is-not', values: ['sydney'] }
      ]
    ])('reads "%s" as %s, taking every word', (text, label, value) => {
      expect(parse(text)[0]).toMatchObject({
        kind: 'filter',
        label,
        value,
        remainder: ''
      })
    })

    it('keeps what a negation rules out to itself', () => {
      expect(parse('not melb')[0]).not.toHaveProperty('negates')
    })

    it('keeps the words a negation didn’t read', () => {
      expect(
        parse('not melb ocean').map((s) => [s.label, s.remainder])
      ).toContainEqual(['City is not in Melbourne', 'ocean'])
    })

    it.each([
      ['not melb', 'City is in Melbourne'],
      ['-walrus', 'Venue is The Quilted Walrus Room'],
      ['city != syd', 'City is in Sydney'],
      ['city!=syd', 'City is in Sydney'],
      ['city ≠ syd', 'City is in Sydney'],
      ['!=syd', 'City is in Sydney'],
      ['status is not sold out', 'Status is Sold out'],
      ['-sold out', 'Status is Sold out'],
      ['not sold out', 'Status is Sold out'],
      ['venue != quilted walrus', 'Venue is The Quilted Walrus Room'],
      ['city isnt sydney', 'City is in Sydney'],
      ['name excludes disco', 'Name contains “disco”']
    ])('never offers the value "%s" rules out', (text, label) => {
      expect(parse(text, { limit: 50 }).map((s) => s.label)).not.toContain(
        label
      )
    })

    it.each([
      'name doesnt contain disco',
      'name does not contain disco',
      'name excludes disco'
    ])('reads no negating word in "%s" as text a field contains', (text) => {
      const contains = parse(text, { limit: 50 }).filter(
        (s) => s.kind === 'filter' && s.value.operator === 'contains'
      )
      expect(contains).toEqual([])
    })

    it('reads "city = syd" as the value', () => {
      expect(parse('city = syd')[0]).toMatchObject({
        label: 'City is in Sydney',
        remainder: ''
      })
    })

    it.each([
      'not this weekend',
      'starts is not this weekend',
      'not after 1 dec'
    ])('reads no date under a negation in "%s"', (text) => {
      const read = parse(text, { limit: 50 }).filter(
        (s) => s.kind === 'filter' && !s.remainder.split(' ').includes('not')
      )
      expect(read).toEqual([])
    })

    it.each(['not next fri', 'not last monday', 'except fri 9 oct'])(
      'reads no day from inside the negated date in "%s"',
      (text) => {
        const dates = parse(text, { limit: 50 }).filter(
          (s) => s.kind === 'filter' && s.value.field === 'starts'
        )
        expect(dates).toEqual([])
      }
    )

    it.each(['starts:!this weekend', 'capacity:!100-500', 'capacity:!>100'])(
      'reads nothing for %s, which has no negative',
      (text) => {
        expect(parse(text).filter((s) => s.kind === 'filter')).toEqual([])
      }
    )

    it('keeps a minus sign on a number', () => {
      expect(parse('capacity:-5')[0]).toMatchObject({
        label: 'Capacity is -5',
        value: { field: 'capacity', operator: 'eq', value: -5 }
      })
      expect(parse('gross:-$5')[0]).toMatchObject({
        value: { field: 'gross', operator: 'eq', value: -5 }
      })
    })

    it.each(['not OZ-55555', '-OZ-55555', 'order number:!OZ-55555'])(
      'never takes the negated identifier in "%s" as exact',
      (text) => {
        expect(parse(text).some((s) => s.kind === 'filter' && s.exact)).toBe(
          false
        )
      }
    )

    it('reads "not" as part of a value when a label holds it', () => {
      const fields = [
        {
          key: 'availability',
          label: 'Availability',
          type: 'option' as const,
          options: [
            { value: 'on', label: 'On sale' },
            { value: 'off', label: 'Not on sale' }
          ]
        }
      ]
      const read = (text: string) =>
        parseRecordQuery(text, { ...options, fields }).map((s) => s.label)
      expect(read('not on sale')[0]).toBe('Availability is Not on sale')
      expect(read('not on sale')).toContain('Availability is not On sale')
    })

    it('takes "not" as plain text when nothing after it reads', () => {
      expect(parse('not xyzzy')).toEqual([])
    })
  })

  describe('<field> is <value>', () => {
    it.each([
      [
        'venue is walrus',
        'Venue is The Quilted Walrus Room',
        { field: 'venue', operator: 'is', values: ['quilted-walrus-room'] }
      ],
      [
        'name contains disco',
        'Name contains “disco”',
        { field: 'name', operator: 'contains', value: 'disco' }
      ],
      [
        'starts is this weekend',
        'Starts is this weekend',
        { field: 'starts', operator: 'within', value: 'this-weekend' }
      ]
    ])('reads "%s", taking the field name and verb', (text, label, value) => {
      expect(parse(text)[0]).toMatchObject({
        kind: 'filter',
        label,
        value,
        remainder: ''
      })
    })

    it.each([
      ['capacity > 100', 'Capacity is more than 100', 'gt', 100],
      ['capacity>100', 'Capacity is more than 100', 'gt', 100],
      ['capacity < 5', 'Capacity is less than 5', 'lt', 5],
      ['capacity = 100', 'Capacity is 100', 'eq', 100],
      ['capacity != 100', 'Capacity is not 100', 'neq', 100],
      ['capacity ≠ 100', 'Capacity is not 100', 'neq', 100],
      ['capacity more than 100', 'Capacity is more than 100', 'gt', 100],
      ['capacity over 100', 'Capacity is more than 100', 'gt', 100],
      ['capacity less than 5', 'Capacity is less than 5', 'lt', 5],
      ['capacity under 5', 'Capacity is less than 5', 'lt', 5],
      ['capacity is more than 100', 'Capacity is more than 100', 'gt', 100],
      ['capacity 20-50', 'Capacity is 20 to 50', 'between', [20, 50]],
      [
        'capacity between 20 and 50',
        'Capacity is 20 to 50',
        'between',
        [20, 50]
      ],
      ['gross over $2,000', 'Gross is more than $2,000', 'gt', 2000],
      ['capacity:20 and 50', 'Capacity is 20 to 50', 'between', [20, 50]],
      [
        'capacity:between 20 and 50',
        'Capacity is 20 to 50',
        'between',
        [20, 50]
      ],
      ['capacity:over 100', 'Capacity is more than 100', 'gt', 100]
    ])('reads "%s" as %s', (text, label, operator, value) => {
      expect(parse(text)[0]).toMatchObject({
        kind: 'filter',
        label,
        value: {
          field: text.startsWith('gross') ? 'gross' : 'capacity',
          operator,
          value
        },
        remainder: ''
      })
    })

    it.each([
      'sold > 100',
      'sold = 100',
      'sold ≠ 5',
      'sold 20-50',
      'sold between 20 and 50',
      'sold>100',
      'a>b sold > 100'
    ])('reads no value from the field name in "%s"', (text) => {
      expect(readSold(text)).not.toContain('Status is Sold out')
    })

    it.each([
      'sold 100 to 20',
      'sold 100-20',
      'sold 100..20',
      'sold between 100 and 20',
      'sold:100-20'
    ])('reads the range "%s" in either order', (text) => {
      expect(
        parseRecordQuery(text, { ...options, fields: soldFields })[0]
      ).toMatchObject({
        label: 'Sold is 20 to 100',
        value: { field: 'sold', operator: 'between', value: [20, 100] },
        remainder: ''
      })
    })

    it('reads no value from a field name that matches it exactly', () => {
      const fields = [
        ...soldFields,
        {
          key: 'state',
          label: 'State',
          type: 'option' as const,
          options: [{ value: 'sold', label: 'Sold' }]
        }
      ]
      expect(readSold('sold', fields)).toContain('State is Sold')
      expect(readSold('sold > 100', fields)).not.toContain('State is Sold')
      expect(readSold('a>b sold > 100', fields)).not.toContain('State is Sold')
    })

    it.each([
      [
        'name lampshade',
        'Name contains “lampshade”',
        { field: 'name', operator: 'contains', value: 'lampshade' }
      ],
      [
        'capacity 100',
        'Capacity is 100',
        { field: 'capacity', operator: 'eq', value: 100 }
      ],
      [
        'city melb',
        'City is in Melbourne',
        { field: 'city', operator: 'is', values: ['melbourne'] }
      ],
      [
        'starts this weekend',
        'Starts is this weekend',
        { field: 'starts', operator: 'within', value: 'this-weekend' }
      ],
      [
        'featured yes',
        'Featured is Yes',
        { field: 'featured', operator: 'is-true' }
      ]
    ])('reads "%s" with no verb as %s', (text, label, value) => {
      expect(parse(text)[0]).toMatchObject({
        kind: 'filter',
        label,
        value,
        remainder: ''
      })
    })

    it('reads "sold 100" as the field, not a status', () => {
      expect(readSold('sold 100')[0]).toBe('Sold is 100')
      expect(readSold('sold 100')).not.toContain('Status is Sold out')
    })

    it.each([
      ['name disco melb', 'City is in Melbourne', 'disco melb'],
      ['name is disco melb', 'City is in Melbourne', 'disco melb'],
      [
        'name contains disco this weekend',
        'Starts is this weekend',
        'disco this weekend'
      ],
      ['name disco oz-12345', 'Order number is oz-12345', 'disco oz-12345']
    ])(
      'stops text in "%s" before a word another filter reads',
      (text, other, whole) => {
        const result = parse(text, { limit: 50 }).map((s) => s.label)
        expect(result.slice(0, 2)).toEqual(['Name contains “disco”', other])
        expect(result).toContain(`Name contains “${whole}”`)
      }
    )

    it('stops text before each filter that reads the rest', () => {
      expect(
        parse('name disco melb this weekend')
          .slice(0, 3)
          .map((s) => s.label)
          .sort()
      ).toEqual([
        'City is in Melbourne',
        'Name contains “disco”',
        'Starts is this weekend'
      ])
    })

    it.each([
      'name lampshade disco',
      'name disco melb lampshade',
      'name kettle hall',
      'name the quilted walrus'
    ])('reads "%s" to the end when no other filter reads the rest', (text) => {
      expect(parse(text)[0]).toMatchObject({
        label: `Name contains “${text.slice(5)}”`,
        remainder: ''
      })
    })

    it('reads no verb as part of the value', () => {
      expect(parse('name is disco', { limit: 50 }).map(summary)).not.toContain(
        'Name contains “is disco”'
      )
    })

    it.each([
      ['city not melb', 'City is not in Melbourne'],
      ['city not empty', 'City is not empty'],
      ['name not disco', 'Name doesn’t contain “disco”'],
      ['capacity not 100', 'Capacity is not 100']
    ])('reads "%s" as %s', (text, label) => {
      expect(parse(text)[0]).toMatchObject({ label, remainder: '' })
      expect(parse(text, { limit: 50 }).map(summary)).not.toContain(
        'Name contains “not disco”'
      )
    })

    it.each([
      ['capacity is empty', 'Capacity is empty', 'capacity', 'is-not-set'],
      ['city is empty', 'City is empty', 'city', 'is-not-set'],
      ['city is not empty', 'City is not empty', 'city', 'is-set'],
      ["city isn't empty", 'City is not empty', 'city', 'is-set'],
      ['starts is empty', 'Starts is empty', 'starts', 'is-not-set'],
      ['starts is not empty', 'Starts is not empty', 'starts', 'is-set'],
      ['name is empty', 'Name is empty', 'name', 'is-not-set'],
      ['featured is empty', 'Featured is empty', 'featured', 'is-not-set'],
      ['city:empty', 'City is empty', 'city', 'is-not-set']
    ])('reads "%s" as %s', (text, label, field, operator) => {
      expect(parse(text)[0]).toMatchObject({
        kind: 'filter',
        label,
        value: { field, operator },
        remainder: ''
      })
    })

    it.each(['sold >= 100', 'sold => 100', 'sold <= 100', 'sold =< 100'])(
      'reads no comparison from "%s"',
      (text) => {
        expect(
          parseRecordQuery(text, { ...options, fields: soldFields, limit: 50 })
            .filter((s) => s.kind === 'filter' && s.value.field === 'sold')
            .map((s) => s.label)
        ).toEqual([])
      }
    )

    it.each([
      'sold >= 100',
      'sold>=100',
      'sold ≥ 100',
      'sold≥100',
      'sold <= 100',
      'sold ≤ 100',
      'sold at least 100',
      'sold at most 100',
      'sold 100+',
      // A comparison word with no number it can read yet.
      'sold more than',
      'sold fewer than',
      'sold less than abc',
      'sold over',
      'sold under x',
      'sold between 5'
    ])('reads no status from the field name in "%s"', (text) => {
      expect(readSold(text)).not.toContain('Status is Sold out')
      expect(
        readSold(text).filter((label) => label.startsWith('Sold is'))
      ).toEqual([])
    })

    it('still reads a status a field name starts', () => {
      expect(readSold('sold out')).toContain('Status is Sold out')
      expect(readSold('sold out > 100')).toContain('Status is Sold out')
    })

    it('never joins numbers a space separates', () => {
      const read = parse('capacity > 5 6', { limit: 50 }).map((s) => [
        s.label,
        s.remainder
      ])
      expect(read).toContainEqual(['Capacity is more than 5', '6'])
      expect(read.map(([label]) => label)).not.toContain(
        'Capacity is more than 56'
      )
      expect(parse('capacity:5 6')).toEqual([])
    })

    it('keeps the words a comparison didn’t read', () => {
      expect(
        parse('capacity > 100 melb').map((s) => [s.label, s.remainder])
      ).toContainEqual(['Capacity is more than 100', 'melb'])
    })

    it('leaves an operator in other words as typed', () => {
      expect(
        parse('melb a>b').map((s) => [s.label, s.remainder])
      ).toContainEqual(['City is in Melbourne', 'a>b'])
      expect(
        parse('a>b capacity>100').map((s) => [s.label, s.remainder])
      ).toContainEqual(['Capacity is more than 100', 'a>b'])
    })

    it('finds an identifier holding an operator among other words', () => {
      const fields = [
        ...eventFields,
        {
          key: 'code',
          label: 'Code',
          type: 'text' as const,
          match: '^PROMO=\\d+$'
        }
      ]
      expect(
        parseRecordQuery('melb promo=10', { ...options, fields }).map((s) => [
          s.label,
          s.remainder
        ])
      ).toContainEqual(['Code is promo=10', 'melb'])
    })

    it.each([
      'capacity between 20',
      'capacity:between 20',
      'city > syd',
      'name > 5',
      'capacity => 100',
      'capacity =< 100',
      'capacity >= 100'
    ])('reads no comparison from "%s"', (text) => {
      const whole = parse(text, { limit: 50 }).filter(
        (s) => s.kind === 'filter' && s.remainder === ''
      )
      expect(whole).toEqual([])
    })

    it('reads only text under contains', () => {
      const read = parse("venue doesn't contain walrus", { limit: 50 })
      expect(read.filter((s) => s.remainder === '')).toEqual([])
      expect(parse('order number contains OZ-55555')[0]).toMatchObject({
        value: { field: 'orderNumber', operator: 'contains' }
      })
    })

    it('completes no date phrase with words after it', () => {
      const read = parse('starts is this melb', { limit: 50 })
      expect(
        read.filter((s) => s.kind === 'filter' && s.value.field === 'starts')
      ).toEqual([])
    })

    it.each([
      ['starts after today', 'Starts is after 3 Oct', 'Starts is today'],
      ['starts from tomorrow', 'Starts is after 3 Oct', 'Starts is tomorrow'],
      ['starts after tomorrow', 'Starts is after 4 Oct', 'Starts is tomorrow'],
      [
        'starts since monday',
        'Starts is after 27 Sept',
        'Starts is on Mon 5 Oct'
      ],
      ['since monday', 'Starts is after 27 Sept', 'Starts is after 4 Oct'],
      [
        'starts until friday',
        'Starts is before 10 Oct',
        'Starts is on Fri 9 Oct'
      ],
      ['after today', 'Starts is after 3 Oct', 'Starts is today']
    ])(
      'reads "%s" as %s, never dropping the comparison',
      (text, label, dropped) => {
        const read = parse(text, { limit: 50 })
        expect(read[0]).toMatchObject({ label, remainder: '' })
        expect(read.map(summary)).not.toContain(dropped)
      }
    )

    it.each([
      ['on or after 20 oct', 'Starts is after 19 Oct'],
      ['on or before 20 oct', 'Starts is before 21 Oct']
    ])('reads "%s" as %s, the day included', (text, label) => {
      const read = parse(text, { limit: 50 })
      expect(read[0]).toMatchObject({ label, remainder: '' })
      expect(read.map(summary)).not.toContain('Status is On sale')
    })

    it.each([
      ['last monday', 'Starts is on Mon 28 Sept', 'Starts is on Mon 5 Oct'],
      ['next sat', 'Starts is on Sat 10 Oct', 'Starts is on Sat 3 Oct'],
      ['sat 10 oct', 'Starts is on Sat 10 Oct', 'Starts is on Sat 3 Oct'],
      [
        'starts sat 10 oct',
        'Starts is on Sat 10 Oct',
        'Starts is on Sat 3 Oct'
      ],
      ['20 to 23 oct', 'Starts is 20 to 23 Oct', 'Starts is on Fri 23 Oct'],
      [
        'on or after 20 oct',
        'Starts is after 19 Oct',
        'Starts is after 20 Oct'
      ],
      ['20 oct onwards', 'Starts is after 19 Oct', 'Starts is on Tue 20 Oct'],
      [
        'next 7 days',
        'Starts is in the next 7 days',
        'Starts is in the next 7 weeks'
      ]
    ])(
      'reads no date from words inside the longer date "%s"',
      (text, label, dropped) => {
        const read = parse(text, { limit: 50 }).map(summary)
        expect(read[0]).toBe(label)
        expect(read).not.toContain(dropped)
      }
    )

    describe('with a festival day field', () => {
      const dayFields = [
        ...eventFields,
        {
          key: 'day',
          label: 'Day',
          type: 'option' as const,
          options: [
            { value: 'saturday', label: 'Saturday' },
            { value: 'sunday', label: 'Sunday' }
          ]
        },
        {
          key: 'stage',
          label: 'Stage',
          type: 'option' as const,
          options: [{ value: 'lawn', label: 'Day Saturday Lawn' }]
        }
      ]
      const readDays = (text: string) =>
        parseRecordQuery(text, {
          ...options,
          fields: dayFields,
          limit: 50
        }).map(summary)

      it('puts the field a statement names before a date that leaves the name', () => {
        const read = readDays('day saturday and sunday')
        expect(read[0]).toBe('Day is Saturday')
        expect(read).toContain('Starts is 3 to 4 Oct')
      })

      it('still offers each day of a range as a value', () => {
        const read = readDays('saturday and sunday')
        expect(read[0]).toBe('Starts is 3 to 4 Oct')
        expect(read).toContain('Day is Saturday')
        expect(read).toContain('Day is Sunday')
      })

      it('keeps the score of a reading that takes the field’s name too', () => {
        const [first] = parseRecordQuery('day saturday lawn', {
          ...options,
          fields: dayFields
        })
        expect(first).toMatchObject({
          label: 'Stage is Day Saturday Lawn',
          score: 1
        })
      })

      it('puts no statement of text a field contains before a date', () => {
        expect(readDays('name disco this weekend')[0]).toBe(
          'Starts is this weekend'
        )
      })

      it('offers no field from the joining word of a range', () => {
        const fields = [
          ...dayFields,
          { key: 'tour', label: 'Tour', type: 'text' as const }
        ]
        const read = parseRecordQuery('sat to sun', { ...options, fields })
        expect(read.map(summary)).not.toContain('field tour')
      })

      it('offers no value from inside a date that isn’t a range', () => {
        expect(readDays('next saturday')).not.toContain('Day is Saturday')
      })
    })

    it('reads no date for a comparison it can’t express', () => {
      const read = parse('starts after 7pm', { limit: 50 })
      expect(
        read.filter((s) => s.kind === 'filter' && s.value.field === 'starts')
      ).toEqual([])
      expect(
        parse('melb before upcoming', { limit: 50 }).filter(
          (s) => s.kind === 'filter' && s.value.field === 'starts'
        )
      ).toEqual([])
    })

    it.each([
      ['before next fri', 'Starts is before 9 Oct', 'Starts is on Fri 9 Oct'],
      [
        'until next month',
        'Starts is before 1 Dec',
        'Starts is this month to date'
      ],
      [
        'melb since last week',
        'Starts is after 20 Sept',
        'Starts is this week to date'
      ]
    ])(
      'reads no date from a later word "%s" compares',
      (text, label, dropped) => {
        const read = parse(text, { limit: 50 }).map(summary)
        expect(read).toContain(label)
        expect(read).not.toContain(dropped)
      }
    )

    it.each([
      'jazz from tomorrow to yesterday',
      'starts from tomorrow to yesterday',
      'since tomorrow and yesterday'
    ])('reads no comparison from a range it can’t read, as "%s"', (text) => {
      const compared = parse(text, { limit: 50 }).filter(
        (s) =>
          s.kind === 'filter' &&
          (s.value.operator === 'after' || s.value.operator === 'before')
      )
      expect(compared).toEqual([])
    })

    it.each([
      'from tomorrow to yesterday',
      'tomorrow to yesterday',
      'jazz tomorrow and yesterday'
    ])('reads no single day from a range it can’t read, as "%s"', (text) => {
      const dates = parse(text, { limit: 50 }).filter(
        (s) => s.kind === 'filter' && s.value.field === 'starts'
      )
      expect(dates).toEqual([])
    })

    it.each([
      ['from tomorrow to next sat', 'Starts is 4 to 10 Oct'],
      ['tomorrow to fri', 'Starts is 4 to 9 Oct'],
      ['tomorrow to sat', 'Starts is 4 to 10 Oct'],
      ['fri to mon', 'Starts is 9 to 12 Oct'],
      ['starts from tomorrow to next sat', 'Starts is 4 to 10 Oct'],
      ['starts on or after 20 oct', 'Starts is after 19 Oct']
    ])('reads "%s" whole, as %s', (text, label) => {
      const read = parse(text, { limit: 50 })
      expect(read[0]).toMatchObject({ label, remainder: '' })
      expect(
        read.filter((s) => s.kind === 'filter' && s.value.field === 'starts')
      ).toHaveLength(1)
    })

    it('still reads "from" before a range it can read, or before other words', () => {
      expect(parse('from 1 oct to 5 oct')[0]).toMatchObject({
        label: 'Starts is 1 to 5 Oct',
        remainder: ''
      })
      expect(parse('from today and melb', { limit: 50 }).map(summary)).toEqual(
        expect.arrayContaining([
          'Starts is after 2 Oct',
          'City is in Melbourne'
        ])
      )
    })

    it('takes an identifier as exact only when nothing is left over', () => {
      const exact = (text: string) =>
        parse(text, { limit: 50 }).filter((s) => s.kind === 'filter' && s.exact)
      expect(exact('order number is OZ-55555')).toMatchObject([
        { label: 'Order number is OZ-55555', remainder: '' }
      ])
      expect(exact('order number is OZ-55555 melb')).toEqual([])
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

  it.each([
    'this weekend',
    '14 mar',
    'after 1 dec',
    'starts after today',
    '1 to 14 mar',
    'next 7 days',
    'fri',
    'starts is empty',
    'upcoming',
    'past',
    'tomorrow'
  ])(
    'labels and describes each date filter from "%s" as its chip reads',
    (text) => {
      const dates = parse(text, { limit: 50 }).filter(
        (s) => s.kind === 'filter' && s.value.field === 'starts'
      )
      expect(dates.length).toBeGreaterThan(0)
      for (const suggestion of dates) {
        const chip = describeRecordFilter(
          suggestion.value as Parameters<typeof describeRecordFilter>[0],
          eventFields,
          options
        )
        expect([suggestion.label, suggestion.description]).toEqual([
          chip.label,
          chip.detail
        ])
      }
    }
  )

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
    expect(week!.label).toBe('Starts is this week')
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
      'Starts is happening now'
    )
    const [ongoing] = parse('ongo')
    const [exact] = parse('ongoing')
    expect(ongoing!.label).toBe('Starts is happening now')
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
      parseRecordQuery(text, { ...options, fields, limit: 50 }).map(
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
    const scores = parseRecordQuery('this weekend', {
      ...options,
      fields,
      limit: 100
    }).map((s) => s.score)
    expect(scores).toHaveLength(30)
    expect(scores.every((score) => score > 0 && score <= 1)).toBe(true)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})
