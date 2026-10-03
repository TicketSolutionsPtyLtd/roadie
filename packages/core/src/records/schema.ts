import { z } from 'zod'

import { dateRangeSchemas } from '../datetime/rangeSchema'

function buildSchema() {
  const field = z.string().min(1)

  const { relativeRange } = dateRangeSchemas()

  const filter = z.discriminatedUnion('operator', [
    z.strictObject({
      field,
      operator: z.enum(['is', 'is-not', 'has-all']),
      values: z
        .array(z.string().min(1, 'Use a value, not empty text'))
        .min(1, 'Pick at least one value')
    }),
    z.strictObject({
      field,
      operator: z.enum(['contains', 'not-contains']),
      value: z.string().min(1, 'Type some text to look for')
    }),
    z.strictObject({
      field,
      operator: z.enum(['eq', 'neq', 'lt', 'gt']),
      value: z.number().refine(Number.isFinite, 'Use a finite number')
    }),
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
    z.strictObject({
      field,
      operator: z.enum(['is-true', 'is-false', 'is-set', 'is-not-set'])
    })
  ])

  const keys = z.array(z.string().min(1))

  return z.strictObject({
    id: z.string().optional(),
    name: z.string().optional(),
    entity: z.string().optional(),
    query: z.strictObject({
      search: z.string(),
      filters: z.array(filter),
      sort: z.array(
        z.strictObject({
          field,
          direction: z.enum(['ascending', 'descending'])
        })
      )
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

let schema: ReturnType<typeof buildSchema> | undefined

// Built on first use, so imports that never validate can drop zod.
export function recordViewSchema() {
  schema ??= buildSchema()
  return schema
}
