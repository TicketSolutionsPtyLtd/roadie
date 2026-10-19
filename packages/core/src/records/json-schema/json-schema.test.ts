import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'

import { toRecordsRequest } from '../request'
import { eventFields } from '../testFields'
import { recordViewJsonSchema, recordsRequestJsonSchema } from './index'

// A draft-07 validator, as a server would run, so the tests check what the
// schema itself accepts.
const ajv = new Ajv({ allErrors: true })
const accepts = (schema: object, value: unknown) => ajv.validate(schema, value)

const view = {
  name: 'Melbourne this weekend',
  query: {
    search: 'lampshade',
    filters: [
      { field: 'city', operator: 'is', values: ['melbourne'] },
      { field: 'starts', operator: 'within', value: 'this-weekend' },
      { field: 'capacity', operator: 'between', value: [100, 500] }
    ],
    sort: [{ field: 'starts', direction: 'ascending' }]
  },
  layout: { type: 'table', columns: { hidden: ['created'] } }
}

const request = toRecordsRequest(
  view.query as Parameters<typeof toRecordsRequest>[0],
  eventFields,
  { now: new Date('2026-10-02T13:30:00Z'), timeZone: 'Australia/Melbourne' },
  { page: 0, pageSize: 50 }
)

describe('recordViewJsonSchema', () => {
  it('accepts a stored view, with or without its version', () => {
    expect(accepts(recordViewJsonSchema(), view)).toBe(true)
    expect(accepts(recordViewJsonSchema(), { ...view, version: 1 })).toBe(true)
  })

  it.each([
    ['another version', { ...view, version: 2 }],
    [
      'an unknown operator',
      {
        ...view,
        query: {
          ...view.query,
          filters: [{ field: 'name', operator: 'like', value: 'x' }]
        }
      }
    ],
    ['an unknown key', { ...view, page: 2 }]
  ])('rejects a view with %s', (_, value) => {
    expect(accepts(recordViewJsonSchema(), value)).toBe(false)
  })
})

describe('recordsRequestJsonSchema', () => {
  it('accepts the request toRecordsRequest builds', () => {
    expect(accepts(recordsRequestJsonSchema(), request)).toBe(true)
    const unpaged = { version: request.version, query: request.query }
    expect(accepts(recordsRequestJsonSchema(), unpaged)).toBe(true)
    expect(
      accepts(recordsRequestJsonSchema(), { ...unpaged, start: 0, end: 50 })
    ).toBe(true)
  })

  it('accepts keys a later release adds, at the top and in the query', () => {
    expect(
      accepts(recordsRequestJsonSchema(), {
        ...request,
        facets: ['city'],
        query: { ...request.query, scopeCount: 1 }
      })
    ).toBe(true)
  })

  it.each([
    ['no version', { ...request, version: undefined }],
    [
      'an unknown operator',
      {
        ...request,
        query: {
          ...request.query,
          filters: [{ field: 'name', operator: 'like', value: 'x' }]
        }
      }
    ],
    [
      'an unknown filter key',
      {
        ...request,
        query: {
          ...request.query,
          filters: [
            { field: 'city', operator: 'is', values: ['perth'], scope: true }
          ]
        }
      }
    ],
    [
      'an unresolved date filter',
      {
        ...request,
        query: {
          ...request.query,
          filters: [{ field: 'starts', operator: 'within', value: 'today' }]
        }
      }
    ],
    ['no zone', { ...request, query: { ...request.query, timeZone: '' } }],
    ['a negative page', { ...request, page: -1 }],
    ['a page without its size', { ...request, pageSize: undefined }],
    ['an end without its start', { version: 1, query: request.query, end: 50 }]
  ])('rejects a request with %s', (_, value) => {
    expect(
      accepts(recordsRequestJsonSchema(), JSON.parse(JSON.stringify(value)))
    ).toBe(false)
  })
})
