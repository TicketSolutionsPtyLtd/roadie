import { describe, expect, it } from 'vitest'

import { recordFields } from './builder'
import { recordsToCsv } from './csv'
import { describeRecordFilter, recordOperatorLabel } from './describe'
import {
  isRecordOptionField,
  recordFilterOperators,
  recordPlaces
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
    { value: 'au', label: 'Australia', kind: 'country' },
    { value: 'au-qld', label: 'Queensland', kind: 'state', parent: 'au' },
    {
      value: 'au-qld-brisbane',
      label: 'Brisbane',
      kind: 'city',
      parent: 'au-qld'
    },
    {
      value: 'au-qld-fortitude-valley',
      label: 'Fortitude Valley',
      kind: 'suburb',
      parent: 'au-qld-brisbane'
    },
    {
      value: 'au-qld-west-end',
      label: 'West End',
      kind: 'suburb',
      parent: 'au-qld-brisbane'
    },
    { value: 'au-vic', label: 'Victoria', parent: 'au' },
    {
      value: 'au-vic-fitzroy',
      label: 'Fitzroy',
      kind: 'suburb',
      parent: 'au-vic'
    }
  ]
})
const placeFields = [field.text('name', { label: 'Name' }), places]

const placeRows: { name: string; location?: string | string[] }[] = [
  { name: 'Valley', location: 'au-qld-fortitude-valley' },
  { name: 'West End', location: 'AU-QLD-WEST-END' },
  { name: 'Brisbane', location: 'au-qld-brisbane' },
  { name: 'Fitzroy', location: 'au-vic-fitzroy' },
  { name: 'Indexed', location: ['nz', 'nz-auckland'] },
  { name: 'Nowhere' },
  { name: 'Hobart', location: 'au-tas-hobart' }
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
  it("lists a record's place, then the places it is in", () => {
    expect(recordPlaces(places, 'au-qld-fortitude-valley')).toEqual([
      'au-qld-fortitude-valley',
      'au-qld-brisbane',
      'au-qld',
      'au'
    ])
  })

  it('lists each of several places once, with theirs', () => {
    expect(
      recordPlaces(places, ['au-qld-west-end', 'au-vic-fitzroy', 'au-qld'])
    ).toEqual([
      'au-qld-west-end',
      'au-qld-brisbane',
      'au-qld',
      'au',
      'au-vic-fitzroy',
      'au-vic'
    ])
  })

  it('finds a place named in another case', () => {
    expect(recordPlaces(places, 'AU-VIC-FITZROY')).toEqual([
      'AU-VIC-FITZROY',
      'au-vic',
      'au'
    ])
    const capitalised = field.location('location', {
      label: 'Location',
      options: [
        { value: 'VIC', label: 'Victoria' },
        { value: 'Fitzroy', label: 'Fitzroy', parent: 'Vic' }
      ]
    })
    expect(recordPlaces(capitalised, 'fitzroy')).toEqual(['fitzroy', 'VIC'])
  })

  it("lists a place it doesn't know, or nothing for no place, alone", () => {
    expect(recordPlaces(places, 'au-tas-hobart')).toEqual(['au-tas-hobart'])
    expect(recordPlaces(places, undefined)).toEqual([])
    expect(recordPlaces(places, '')).toEqual([])
  })

  it("stops at a parent it doesn't know", () => {
    const orphaned = field.location('location', {
      label: 'Location',
      options: [
        { value: 'fitzroy', label: 'Fitzroy', parent: 'melbourne' },
        { value: 'carlton', label: 'Carlton', parent: 'fitzroy' }
      ]
    })
    expect(recordPlaces(orphaned, 'carlton')).toEqual(['carlton', 'fitzroy'])
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
    expect(recordPlaces(looped, 'a')).toEqual(['a', 'b'])
    expect(recordPlaces(looped, 'c')).toEqual(['c'])
  })

  it('lists only the values on a field without places', () => {
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
    expect(recordPlaces(unlisted, 'au-qld-brisbane')).toEqual([
      'au-qld-brisbane'
    ])
    expect(recordPlaces(nested, 'opening')).toEqual(['opening'])
  })

  it.each<[RecordFilter, string[]]>([
    [
      { field: 'location', operator: 'is', values: ['au-qld-brisbane'] },
      ['Valley', 'West End', 'Brisbane']
    ],
    [
      { field: 'location', operator: 'is', values: ['au'] },
      ['Valley', 'West End', 'Brisbane', 'Fitzroy']
    ],
    [
      {
        field: 'location',
        operator: 'is',
        values: ['au-qld-west-end', 'au-vic']
      },
      ['West End', 'Fitzroy']
    ],
    [
      { field: 'location', operator: 'is-not', values: ['au-qld'] },
      ['Fitzroy', 'Indexed', 'Nowhere', 'Hobart']
    ],
    [{ field: 'location', operator: 'is', values: ['nz'] }, ['Indexed']],
    [
      { field: 'location', operator: 'is', values: ['au-tas-hobart'] },
      ['Hobart']
    ],
    [{ field: 'location', operator: 'is', values: ['au-tas'] }, []],
    [{ field: 'location', operator: 'is-not-set' }, ['Nowhere']],
    [
      { field: 'location', operator: 'is-set' },
      ['Valley', 'West End', 'Brisbane', 'Fitzroy', 'Indexed', 'Hobart']
    ]
  ])('matches %j by place', (filter, names) => {
    expect(inPlaces(filter)).toEqual(names)
  })

  it('matches only the value itself on a field without places', () => {
    const unlisted = field.location('location', { label: 'Location' })
    expect(
      inPlaces({ field: 'location', operator: 'is', values: ['au-qld'] }, [
        unlisted
      ])
    ).toEqual([])
    expect(
      inPlaces(
        { field: 'location', operator: 'is', values: ['au-qld-brisbane'] },
        [unlisted]
      )
    ).toEqual(['Brisbane'])
  })

  it('resolves a filter on a place as a plain term, for any backend', () => {
    const filter: RecordFilter = {
      field: 'location',
      operator: 'is-not',
      values: ['au-qld']
    }
    expect(
      resolveRecordQuery(view([filter]).query, placeFields, options).filters
    ).toEqual([filter])
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'location', operator: 'is', values: ['au-qld'] },
      'location = "au-qld"'
    ],
    [
      { field: 'location', operator: 'is-not', values: ['au-vic', 'au-qld'] },
      'location NOT IN ["au-vic", "au-qld"]'
    ]
  ])('asks Meilisearch for %j as a term', (filter, expression) => {
    expect(toMeilisearch(view([filter]), placeFields, options).filter).toEqual([
      expression
    ])
  })

  it('keeps the place alone in the URL', () => {
    const written = view([
      { field: 'location', operator: 'is', values: ['au-qld-brisbane'] }
    ])
    expect(toSearchParams(written).get('f')).toBe('location:is:au-qld-brisbane')
    expect(
      fromSearchParams(toSearchParams(written), placeFields).view.query.filters
    ).toEqual(written.query.filters)
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'location', operator: 'is', values: ['au-qld-brisbane'] },
      'Location is in Brisbane'
    ],
    [
      { field: 'location', operator: 'is-not', values: ['au-qld-brisbane'] },
      'Location is not in Brisbane'
    ],
    [
      {
        field: 'location',
        operator: 'is',
        values: ['au-qld-brisbane', 'au-vic']
      },
      'Location is in Brisbane or Victoria'
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
    ['australia', 'Location is in Australia', 'Country'],
    ['victoria', 'Location is in Victoria', 'In Australia']
  ])('describes "%s" by where it is', (text, label, description) => {
    const [first] = parseQuery(text, { fields: placeFields, ...options })
    expect(first).toMatchObject({ kind: 'filter', label, description })
  })

  it('reads a place by its label, or its whole id, never a word inside its id', () => {
    const labels = (text: string) =>
      parseQuery(text, { fields: placeFields, ...options })
        .filter((suggestion) => suggestion.kind === 'filter')
        .map((suggestion) => suggestion.label)
    expect(labels('vic')).toEqual(['Location is in Victoria'])
    expect(labels('au-vic')).toEqual(['Location is in Victoria'])
  })

  it('describes a place without a kind or parent by nothing', () => {
    const [first] = parseQuery('perth', { fields, ...options })
    expect(first).not.toHaveProperty('description')
  })
})
