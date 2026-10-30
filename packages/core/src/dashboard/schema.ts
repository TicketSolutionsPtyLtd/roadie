import { z } from 'zod'

import { dateRangeSchemas } from '../datetime/rangeSchema'
import { STATUS_INTENTS } from './cells'
import { goodWhen, valueFormat, valueFormatOptions } from './fields'
import { CARD_SIZES, CARD_STATES, COLUMN_KINDS } from './layout'
import {
  barPlotSchema,
  funnelPlotSchema,
  heatmapPlotSchema,
  histogramPlotSchema,
  linePlotSchema,
  plotSchema,
  rankedBarsPlotSchema,
  scatterPlotSchema,
  smallMultiplesPlotSchema,
  stackedAreaPlotSchema,
  stackedBarsPlotSchema,
  staticPlotSchema
} from './plots'

const delta = z.strictObject({
  value: z.number(),
  format: valueFormat.optional(),
  ...valueFormatOptions,
  goodWhen: goodWhen.optional(),
  baseline: z.number().optional(),
  /** Compares with the dashboard's period comparison, and follows it. */
  comparison: z.boolean().optional()
})

const status = z.strictObject({
  intent: z.enum(STATUS_INTENTS),
  label: z.string().min(1).optional(),
  order: z.number().optional()
})

const column = z.strictObject({
  key: z.string().min(1),
  header: z.string().min(1),
  kind: z.enum(COLUMN_KINDS),
  format: valueFormat.optional(),
  ...valueFormatOptions,
  goodWhen: goodWhen.optional(),
  baseline: z.number().optional(),
  target: z.number().optional(),
  max: z.number().positive().optional(),
  /** `false` leaves a number column out of a totals row's sum. */
  total: z.boolean().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  pin: z.boolean().optional(),
  /** A text or status column's second line, read from this key. */
  secondaryKey: z.string().optional(),
  emptyText: z.string().optional(),
  /** A status column's keys, each with its intent and label. */
  status: z.record(z.string(), status).optional()
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
    .optional(),
  median: z.boolean().optional()
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
  ...valueFormatOptions,
  delta: delta.optional(),
  takeaway: z.string().optional()
}

const statCard = z.strictObject({
  ...base,
  kind: z.literal('stat'),
  value: z.union([z.number(), z.string()]),
  format: valueFormat.optional(),
  ...valueFormatOptions,
  delta: delta.optional(),
  trend: z.array(z.number()).optional(),
  reference: z
    .strictObject({ value: z.number(), label: z.string().min(1) })
    .optional(),
  source: z.string().optional()
})

const totals = z.union([
  z.literal('sum'),
  z.strictObject({
    label: z.string().min(1).optional(),
    values: z.record(z.string(), cell).optional()
  })
])

const tableCard = z.strictObject({
  ...base,
  ...headline,
  kind: z.literal('table'),
  columns: tableData.shape.columns,
  rows: tableData.shape.rows,
  /** A footer row: 'sum' adds up the number columns, or give a label and values. */
  totals: totals.optional(),
  /** Groups rows by these text or status columns, outermost first. */
  groupBy: z.array(z.string().min(1)).min(1).optional(),
  /** Opens every group, or the groups at these paths of values. */
  defaultExpanded: z
    .union([z.boolean(), z.array(z.array(z.string()).min(1))])
    .optional(),
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

const ranges = dateRangeSchemas()

const period = z.strictObject({
  range: ranges.dateRangeValue,
  compare: z
    .union([
      ranges.comparison,
      z
        .string()
        .min(1)
        .refine((value) => value !== 'none' && value !== 'custom', {
          message: 'Leave out compare for no comparison, or give custom dates'
        })
        .describe(
          "An app's own comparison, such as 'similar'. Roadie works out no dates for it"
        )
    ])
    .optional(),
  /** How much of the comparison the data covers, from `resolveComparison`. */
  history: z.enum(['partial', 'unavailable']).optional()
})

export const dashboardSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1),
  period: period.optional(),
  sections: z.array(section).min(1)
})

const withoutPeriod = {
  selectsPeriod: z
    .never({ error: 'A chart document has no period for a drag to set' })
    .optional()
}

const documentPlot = z.discriminatedUnion('kind', [
  staticPlotSchema,
  linePlotSchema.extend(withoutPeriod),
  barPlotSchema.extend(withoutPeriod),
  rankedBarsPlotSchema,
  stackedBarsPlotSchema,
  stackedAreaPlotSchema.extend(withoutPeriod),
  histogramPlotSchema,
  funnelPlotSchema,
  heatmapPlotSchema,
  scatterPlotSchema,
  smallMultiplesPlotSchema
])

/**
 * One chart card without the dashboard around it, to save, send, or render
 * as a file. Check one with `validateChartDocument`.
 *
 * @beta The shape may change until the documents package agrees with it.
 */
export const chartDocumentSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('chart'),
  label: z.string().min(1),
  context: z.string().optional(),
  ...headline,
  // A document has no period, so its delta can't follow one.
  delta: delta.omit({ comparison: true }).optional(),
  source: z.string().min(1),
  plot: documentPlot
})

export type DeltaSpec = z.infer<typeof delta>
export type DashboardPeriodSpec = z.infer<typeof period>
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
/** @beta The shape may change until the documents package agrees with it. */
export type ChartDocument = z.infer<typeof chartDocumentSchema>
/** @beta */
export type ChartDocumentPlot = ChartDocument['plot']

export const dashboardJsonSchema: Record<string, unknown> =
  z.toJSONSchema(dashboardSchema)
