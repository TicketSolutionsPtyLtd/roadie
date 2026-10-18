import { describe, expect, it } from 'vitest'

import { recordFields } from './builder'
import { recordsToCsv } from './csv'
import { describeRecordFilter, recordOperatorLabel } from './describe'
import {
  isRecordOptionField,
  recordFilterOperators,
  recordPlacesWithin
} from './fields'
import { formatRecordValue } from './format'
import { matchesRecordQuery } from './match'
import { toMeilisearch } from './meilisearch'
import { parseQuery } from './parse'
import { resolveRecordQuery } from './resolve'
import { fromSearchParams, toSearchParams } from './searchParams'
import { sortRecords } from './sort'
import type { RecordField, RecordFilter, RecordView } from './types'
import { validateRecordView } from './validate'

const field = recordFields<{ name: string; location?: string }>()
const location = field.location('location', {
  label: 'Location',
  options: [
    { value: 'perth', label: 'Perth' },
    { value: 'brisbane', label: 'Brisbane' },
    { value: 'sa', label: 'Adelaide' }
  ]
})
const fields = [field.text('name', { label: 'Name' }), location]

const options = {
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
}

const rows = [
  { name: 'One', location: 'perth' },
  { name: 'Two', location: 'brisbane' },
  { name: 'Three' },
  { name: 'Four', location: 'sa' }
]

const view = (filters: RecordFilter[]): RecordView => ({
  query: { search: '', filters, sort: [] },
  layout: { type: 'table' }
})

const matching = (filter: RecordFilter) =>
  rows
    .filter((row) =>
      matchesRecordQuery(
        row,
        resolveRecordQuery(view([filter]).query, fields, options),
        fields
      )
    )
    .map((row) => row.name)

describe('a location field', () => {
  it('is built with its type', () => {
    expect(location.type).toBe('location')
    expect(isRecordOptionField(location)).toBe(true)
    expect(isRecordOptionField(fields[0]!)).toBe(false)
  })

  it('filters like a single option', () => {
    expect(recordFilterOperators(location)).toEqual([
      'is',
      'is-not',
      'is-set',
      'is-not-set'
    ])
  })

  it.each<[RecordFilter, string[]]>([
    [{ field: 'location', operator: 'is', values: ['perth'] }, ['One']],
    [
      { field: 'location', operator: 'is-not', values: ['perth'] },
      ['Two', 'Three', 'Four']
    ],
    [{ field: 'location', operator: 'is-not-set' }, ['Three']]
  ])('matches %j', (filter, names) => {
    expect(matching(filter)).toEqual(names)
  })

  it('validates its operators', () => {
    expect(
      validateRecordView(
        view([{ field: 'location', operator: 'is-not', values: ['perth'] }]),
        fields
      ).ok
    ).toBe(true)
    const result = validateRecordView(
      view([{ field: 'location', operator: 'contains', value: 'per' }]),
      fields
    )
    expect(result.problems[0]?.message).toContain('is a location field')
  })

  it('reads as its chip', () => {
    expect(
      describeRecordFilter(
        { field: 'location', operator: 'is', values: ['brisbane', 'perth'] },
        fields,
        options
      ).label
    ).toBe('Location is in Brisbane or Perth')
  })

  it.each(['perth', 'location:perth'])('suggests a value for "%s"', (text) => {
    const [first] = parseQuery(text, { fields, ...options })
    expect(first).toMatchObject({
      kind: 'filter',
      label: 'Location is in Perth',
      value: { field: 'location', operator: 'is', values: ['perth'] }
    })
  })

  it.each(['location is not perth', 'not perth', '-perth'])(
    'reads "%s" as its opposite',
    (text) => {
      const [first] = parseQuery(text, { fields, ...options })
      expect(first).toMatchObject({
        kind: 'filter',
        label: 'Location is not in Perth',
        value: { field: 'location', operator: 'is-not', values: ['perth'] },
        remainder: ''
      })
    }
  )

  it('round trips through the URL', () => {
    const written = view([
      { field: 'location', operator: 'is-not', values: ['perth', 'sa'] }
    ])
    const read = fromSearchParams(toSearchParams(written), fields)
    expect(read.source).toBe('url')
    expect(read.view.query.filters).toEqual(written.query.filters)
  })

  it('shows, exports and sorts by its labels', () => {
    expect(formatRecordValue(rows[0]!, location, options)).toBe('Perth')
    expect(recordsToCsv(rows.slice(0, 1), fields, options)).toBe(
      'Name,Location\r\nOne,Perth'
    )
    expect(
      sortRecords(
        rows,
        [{ field: 'location', direction: 'ascending' }],
        fields,
        options
      ).map((row) => row.name)
    ).toEqual(['Four', 'Two', 'One', 'Three'])
  })
})

const places = field.location('location', {
  label: 'Location',
  options: [
    { value: 'qld', label: 'Queensland', kind: 'state' },
    { value: 'brisbane', label: 'Brisbane', kind: 'city', parent: 'qld' },
    {
      value: 'fortitude-valley',
      label: 'Fortitude Valley',
      kind: 'suburb',
      parent: 'brisbane'
    },
    {
      value: 'west-end',
      label: 'West End',
      kind: 'suburb',
      parent: 'brisbane'
    },
    { value: 'gold-coast', label: 'Gold Coast', kind: 'city', parent: 'qld' },
    { value: 'vic', label: 'Victoria', kind: 'state' },
    { value: 'fitzroy', label: 'Fitzroy', parent: 'vic' }
  ]
})
const placeFields = [field.text('name', { label: 'Name' }), places]

const placeRows = [
  { name: 'Valley', location: 'fortitude-valley' },
  { name: 'West End', location: 'west-end' },
  { name: 'Brisbane', location: 'brisbane' },
  { name: 'Gold Coast', location: 'gold-coast' },
  { name: 'Fitzroy', location: 'fitzroy' },
  { name: 'Nowhere' },
  { name: 'Hobart', location: 'hobart' }
]

const inPlaces = (filter: RecordFilter, fields = placeFields) =>
  placeRows
    .filter((row) =>
      matchesRecordQuery(
        row,
        resolveRecordQuery(view([filter]).query, fields, options),
        fields
      )
    )
    .map((row) => row.name)

describe("a location's places", () => {
  it('lists a place and every place inside it', () => {
    expect(recordPlacesWithin(places, ['qld'])).toEqual([
      'qld',
      'brisbane',
      'fortitude-valley',
      'west-end',
      'gold-coast'
    ])
    expect(recordPlacesWithin(places, ['brisbane', 'vic'])).toEqual([
      'brisbane',
      'vic',
      'fortitude-valley',
      'west-end',
      'fitzroy'
    ])
  })

  it("lists a place it doesn't know, or one with nothing inside, alone", () => {
    expect(recordPlacesWithin(places, ['hobart'])).toEqual(['hobart'])
    expect(recordPlacesWithin(places, ['west-end'])).toEqual(['west-end'])
  })

  it('takes in the places inside one named in another case, as filters match', () => {
    expect(recordPlacesWithin(places, ['Brisbane'])).toEqual([
      'Brisbane',
      'fortitude-valley',
      'west-end'
    ])
    expect(
      inPlaces({ field: 'location', operator: 'is', values: ['BRISBANE'] })
    ).toEqual(['Valley', 'West End', 'Brisbane'])
  })

  it("treats a place whose parent it doesn't know as a root", () => {
    const orphaned = field.location('location', {
      label: 'Location',
      options: [
        { value: 'fitzroy', label: 'Fitzroy', parent: 'melbourne' },
        { value: 'carlton', label: 'Carlton', parent: 'fitzroy' }
      ]
    })
    expect(recordPlacesWithin(orphaned, ['melbourne'])).toEqual(['melbourne'])
    expect(recordPlacesWithin(orphaned, ['fitzroy'])).toEqual([
      'fitzroy',
      'carlton'
    ])
  })

  it('stops at a cycle', () => {
    const looped = field.location('location', {
      label: 'Location',
      options: [
        { value: 'a', label: 'A', parent: 'b' },
        { value: 'b', label: 'B', parent: 'a' },
        { value: 'c', label: 'C', parent: 'c' }
      ]
    })
    expect(recordPlacesWithin(looped, ['a'])).toEqual(['a', 'b'])
    expect(recordPlacesWithin(looped, ['c'])).toEqual(['c'])
  })

  it('leaves values alone on a field without places', () => {
    const unlisted = field.location('location', { label: 'Location' })
    const nested: RecordField = {
      key: 'session',
      label: 'Session',
      type: 'option',
      options: [
        { value: 'weekender', label: 'Weekender' },
        { value: 'opening', label: 'Opening night', parent: 'weekender' }
      ]
    }
    expect(recordPlacesWithin(unlisted, ['brisbane'])).toEqual(['brisbane'])
    expect(recordPlacesWithin(nested, ['weekender'])).toEqual(['weekender'])
  })

  it.each<[RecordFilter, string[]]>([
    [
      { field: 'location', operator: 'is', values: ['brisbane'] },
      ['Valley', 'West End', 'Brisbane']
    ],
    [
      { field: 'location', operator: 'is', values: ['qld'] },
      ['Valley', 'West End', 'Brisbane', 'Gold Coast']
    ],
    [
      { field: 'location', operator: 'is', values: ['west-end', 'vic'] },
      ['West End', 'Fitzroy']
    ],
    [
      { field: 'location', operator: 'is-not', values: ['brisbane'] },
      ['Gold Coast', 'Fitzroy', 'Nowhere', 'Hobart']
    ],
    [{ field: 'location', operator: 'is', values: ['hobart'] }, ['Hobart']],
    [{ field: 'location', operator: 'is-not-set' }, ['Nowhere']],
    [
      { field: 'location', operator: 'is-set' },
      ['Valley', 'West End', 'Brisbane', 'Gold Coast', 'Fitzroy', 'Hobart']
    ]
  ])('matches %j by place', (filter, names) => {
    expect(inPlaces(filter)).toEqual(names)
  })

  it('matches only the place itself on a field without places', () => {
    const unlisted = field.location('location', { label: 'Location' })
    expect(
      inPlaces({ field: 'location', operator: 'is', values: ['brisbane'] }, [
        unlisted
      ])
    ).toEqual(['Brisbane'])
  })

  it('resolves a filter to its places, for any backend', () => {
    expect(
      resolveRecordQuery(
        view([{ field: 'location', operator: 'is-not', values: ['brisbane'] }])
          .query,
        placeFields,
        options
      ).filters
    ).toEqual([
      {
        field: 'location',
        operator: 'is-not',
        values: ['brisbane', 'fortitude-valley', 'west-end']
      }
    ])
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'location', operator: 'is', values: ['brisbane'] },
      'location IN ["brisbane", "fortitude-valley", "west-end"]'
    ],
    [
      { field: 'location', operator: 'is-not', values: ['vic'] },
      'location NOT IN ["vic", "fitzroy"]'
    ],
    [
      { field: 'location', operator: 'is', values: ['hobart'] },
      'location = "hobart"'
    ]
  ])('asks Meilisearch for %j by place', (filter, expression) => {
    expect(toMeilisearch(view([filter]), placeFields, options).filter).toEqual([
      expression
    ])
  })

  it('keeps the place alone in the URL', () => {
    const written = view([
      { field: 'location', operator: 'is', values: ['brisbane'] }
    ])
    expect(toSearchParams(written).get('f')).toBe('location:is:brisbane')
    expect(
      fromSearchParams(toSearchParams(written), placeFields).view.query.filters
    ).toEqual(written.query.filters)
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'location', operator: 'is', values: ['brisbane'] },
      'Location is in Brisbane'
    ],
    [
      { field: 'location', operator: 'is-not', values: ['brisbane'] },
      'Location is not in Brisbane'
    ],
    [
      { field: 'location', operator: 'is', values: ['brisbane', 'gold-coast'] },
      'Location is in Brisbane or Gold Coast'
    ],
    [{ field: 'location', operator: 'is-set' }, 'Location is not empty']
  ])('reads %j as "%s"', (filter, label) => {
    expect(describeRecordFilter(filter, placeFields, options).label).toBe(label)
  })

  it('names "is in" and "is not in" for a location only', () => {
    expect(recordOperatorLabel('is', places)).toBe('is in')
    expect(recordOperatorLabel('is-not', places)).toBe('is not in')
    expect(recordOperatorLabel('is-set', places)).toBe('is not empty')
    expect(recordOperatorLabel('is')).toBe('is')
    expect(recordOperatorLabel('is-not', placeFields[0])).toBe('is not')
  })

  it.each([
    ['fortitude', 'Location is in Fortitude Valley', 'Suburb in Brisbane'],
    ['queensland', 'Location is in Queensland', 'State'],
    ['fitzroy', 'Location is in Fitzroy', 'In Victoria']
  ])('describes "%s" by where it is', (text, label, description) => {
    const [first] = parseQuery(text, { fields: placeFields, ...options })
    expect(first).toMatchObject({ kind: 'filter', label, description })
  })

  it('describes a place without a kind or parent by nothing', () => {
    const [first] = parseQuery('perth', { fields, ...options })
    expect(first).not.toHaveProperty('description')
  })
})
