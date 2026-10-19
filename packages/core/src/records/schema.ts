import { z } from 'zod'

import { dateRangeSchemas } from '../datetime/rangeSchema'

function filterSchemas() {
  const field = z.string().min(1)
  return {
    field,
    values: z.strictObject({
      field,
      operator: z.enum(['is', 'is-not', 'has-all']),
      values: z
        .array(z.string().min(1, 'Use a value, not empty text'))
        .min(1, 'Pick at least one value')
    }),
    text: z.strictObject({
      field,
      operator: z.enum(['contains', 'not-contains']),
      value: z.string().min(1, 'Type some text to look for')
    }),
    compare: z.strictObject({
      field,
      operator: z.enum(['eq', 'neq', 'lt', 'gt']),
      value: z.number().refine(Number.isFinite, 'Use a finite number')
    }),
    flag: z.strictObject({
      field,
      operator: z.enum(['is-true', 'is-false', 'is-set', 'is-not-set'])
    }),
    sort: z.strictObject({
      field,
      direction: z.enum(['ascending', 'descending'])
    })
  }
}

function buildSchema() {
  const { field, values, text, compare, flag, sort } = filterSchemas()

  const { relativeRange } = dateRangeSchemas()

  const filter = z.discriminatedUnion('operator', [
    values,
    text,
    compare,
    z.strictObject({
      field,
      operator: z.literal('between'),
      value: z.union([
        z.tuple([z.number(), z.number()]),
        z.tuple([z.string(), z.string()])
      ])
    }),
    z.strictObject({
      field,
      operator: z.enum(['on', 'before', 'after']),
      value: z.string()
    }),
    z.strictObject({
      field,
      operator: z.literal('within'),
      value: relativeRange
    }),
    flag
  ])

  const keys = z.array(z.string().min(1))

  return z.strictObject({
    version: z
      .literal(1, 'Unsupported view version; this release reads version 1')
      .default(1),
    id: z.string().optional(),
    name: z.string().optional(),
    entity: z.string().optional(),
    query: z.strictObject({
      search: z.string(),
      filters: z.array(filter),
      sort: z.array(sort)
    }),
    layout: z.discriminatedUnion('type', [
      z.strictObject({
        type: z.literal('table'),
        columns: z
          .strictObject({ order: keys.optional(), hidden: keys.optional() })
          .optional()
      }),
      z.strictObject({ type: z.literal('grid'), fields: keys.optional() })
    ]),
    group: z.string().optional()
  })
}

function buildRequestSchema() {
  const { field, values, text, compare, flag, sort } = filterSchemas()
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  const whole = (min: number) => z.number().int().min(min).optional()

  const filter = z.discriminatedUnion('operator', [
    values,
    text,
    compare,
    z.strictObject({
      field,
      operator: z.literal('between'),
      value: z.tuple([z.number(), z.number()])
    }),
    z.strictObject({
      field,
      operator: z.literal('overlaps'),
      range: z.discriminatedUnion('kind', [
        z
          .strictObject({
            kind: z.literal('dates'),
            start: date.nullable(),
            end: date.nullable()
          })
          .describe(
            'Calendar dates, inclusive, null for open: the venue-local date for event and access fields, the date itself for date fields'
          ),
        z
          .strictObject({
            kind: z.literal('instants'),
            start: z.number().nullable(),
            end: z.number().nullable()
          })
          .describe('Epoch milliseconds, inclusive, null for open')
      ])
    }),
    flag
  ])

  // Loose at the top and in the query, so a key a later release adds stays
  // version 1; filters and sorts stay strict, as a key there changes a match.
  return z
    .looseObject({
      version: z.literal(1),
      query: z.looseObject({
        search: z.string(),
        filters: z.array(filter),
        sort: z.array(sort),
        timeZone: z
          .string()
          .min(1)
          .describe("The viewer's IANA zone, for rows that name no venue zone")
      }),
      page: whole(0).describe('Zero-based, with pageSize'),
      pageSize: whole(1),
      start: whole(0).describe('The first row, zero-based, with end'),
      end: whole(1).describe('The row after the last, exclusive')
    })
    .refine(
      (request) =>
        (request.page === undefined) === (request.pageSize === undefined) &&
        (request.start === undefined) === (request.end === undefined) &&
        (request.page === undefined || request.start === undefined),
      'Page with pageSize, or start with end, or neither'
    )
    .describe(
      'Paged with page and pageSize, ranged with start and end, or neither for every match, never both'
    )
}

let schema: ReturnType<typeof buildSchema> | undefined

// Built on first use, so imports that never validate can drop zod.
export function recordViewSchema() {
  schema ??= buildSchema()
  return schema
}

let requestSchema: ReturnType<typeof buildRequestSchema> | undefined

export function recordsRequestSchema() {
  requestSchema ??= buildRequestSchema()
  return requestSchema
}
