import { z } from 'zod'

import { goodWhen, valueFormat } from './fields'
import { CARD_SIZES, CARD_STATES, COLUMN_KINDS } from './layout'
import { plotSchema } from './plots'

const delta = z.strictObject({
  value: z.number(),
  format: valueFormat.optional(),
  goodWhen: goodWhen.optional(),
  baseline: z.number().optional()
})

const column = z.strictObject({
  key: z.string().min(1),
  header: z.string().min(1),
  kind: z.enum(COLUMN_KINDS),
  format: valueFormat.optional(),
  goodWhen: goodWhen.optional(),
  baseline: z.number().optional(),
  target: z.number().optional(),
  max: z.number().positive().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  pin: z.boolean().optional(),
  secondaryKey: z.string().optional(),
  emptyText: z.string().optional()
})

const cell = z.union([z.string(), z.number(), z.null(), z.array(z.number())])
const tableData = z.strictObject({
  columns: z.array(column).min(1),
  rows: z.array(z.record(z.string(), cell))
})

const CHART_TOKEN_REFERENCE = /^var\(--chart-[a-z0-9-]+\)$/

const legendItem = z.strictObject({
  label: z.string().min(1),
  shape: z.enum(['line', 'dash', 'dot', 'band', 'swatch']).optional(),
  color: z
    .string()
    .regex(
      CHART_TOKEN_REFERENCE,
      'Use a Roadie chart token, like var(--chart-1)'
    )
    .optional()
})

const base = {
  id: z.string().min(1),
  size: z.enum(CARD_SIZES),
  label: z.string().min(1),
  context: z.string().optional(),
  state: z.enum(CARD_STATES).optional(),
  emptyMessage: z.string().optional(),
  errorMessage: z.string().optional(),
  staleLabel: z.string().optional(),
  data: z
    .strictObject({
      source: z.string().min(1),
      params: z.record(z.string(), z.unknown()).optional()
    })
    .optional()
}

const headline = {
  value: z.union([z.number(), z.string()]).optional(),
  format: valueFormat.optional(),
  delta: delta.optional(),
  takeaway: z.string().optional()
}

const statCard = z.strictObject({
  ...base,
  kind: z.literal('stat'),
  value: z.union([z.number(), z.string()]),
  format: valueFormat.optional(),
  delta: delta.optional(),
  trend: z.array(z.number()).optional(),
  reference: z
    .strictObject({ value: z.number(), label: z.string().min(1) })
    .optional(),
  source: z.string().optional()
})

const tableCard = z.strictObject({
  ...base,
  ...headline,
  kind: z.literal('table'),
  columns: tableData.shape.columns,
  rows: tableData.shape.rows,
  source: z.string().min(1)
})

const chartCard = z
  .strictObject({
    ...base,
    ...headline,
    kind: z.literal('chart'),
    plot: plotSchema,
    table: tableData.optional(),
    legend: z.array(legendItem).optional(),
    view: z.enum(['chart', 'table']).optional(),
    source: z.string().min(1)
  })
  // .check() keeps chartCard a ZodObject (a .refine() wrapper wouldn't),
  // which the discriminatedUnion above needs.
  .check((payload) => {
    if (payload.value.plot.kind === 'static' && !payload.value.table)
      payload.issues.push({
        code: 'custom',
        message: 'A static plot needs a table',
        path: ['table'],
        input: payload.value
      })
  })

const noteCard = z.strictObject({
  ...base,
  kind: z.literal('note'),
  body: z.string().min(1),
  source: z.string().optional()
})

const card = z.discriminatedUnion('kind', [
  statCard,
  tableCard,
  chartCard,
  noteCard
])

const section = z.strictObject({
  title: z.string().min(1),
  description: z.string().optional(),
  cards: z.array(card)
})

export const dashboardSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1),
  sections: z.array(section).min(1)
})

export type DeltaSpec = z.infer<typeof delta>
export type TableColumn = z.infer<typeof column>
export type TableCell = z.infer<typeof cell>
export type TableRow = Record<string, TableCell>
export type TableData = z.infer<typeof tableData>
export type LegendItem = z.infer<typeof legendItem>
export type StatCard = z.infer<typeof statCard>
export type TableCard = z.infer<typeof tableCard>
export type ChartCard = z.infer<typeof chartCard>
export type NoteCard = z.infer<typeof noteCard>
export type DashboardCard = z.infer<typeof card>
export type DashboardSection = z.infer<typeof section>
export type DashboardSpec = z.infer<typeof dashboardSchema>

export const dashboardJsonSchema: Record<string, unknown> =
  z.toJSONSchema(dashboardSchema)
