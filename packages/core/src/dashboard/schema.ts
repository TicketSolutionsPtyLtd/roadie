import { z } from 'zod'

export const CARD_SIZES = ['stat', 'sm', 'md', 'lg', 'full'] as const
export const CARD_KINDS = ['stat', 'table', 'chart', 'note'] as const
export const CARD_STATES = [
  'ready',
  'loading',
  'empty',
  'error',
  'stale'
] as const
export const COLUMN_KINDS = [
  'text',
  'number',
  'delta',
  'sparkline',
  'meter'
] as const
const VALUE_FORMATS = [
  'number',
  'compact',
  'percent',
  'currency',
  'compactCurrency',
  'points',
  'index'
] as const

export type CardSize = (typeof CARD_SIZES)[number]
export type CardKind = (typeof CARD_KINDS)[number]
export type CardState = (typeof CARD_STATES)[number]
export type ColumnKind = (typeof COLUMN_KINDS)[number]

const valueFormat = z.enum(VALUE_FORMATS)
const goodWhen = z.enum(['up', 'down', 'neither'])

const delta = z.object({
  value: z.number(),
  format: valueFormat.optional(),
  goodWhen: goodWhen.optional(),
  baseline: z.number().optional()
})

const column = z.object({
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
const tableData = z.object({
  columns: z.array(column).min(1),
  rows: z.array(z.record(z.string(), cell))
})

const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript):/i
const isSafeImageUrl = (url: string) => !UNSAFE_SCHEME.test(url)

const safeUrl = z
  .string()
  .min(1)
  .refine(isSafeImageUrl, { message: 'Use an http(s) or relative image URL' })

const staticPlot = z.object({
  kind: z.literal('static'),
  src: safeUrl,
  srcDark: safeUrl.optional(),
  alt: z.string().min(1)
})

const legendItem = z.object({
  label: z.string().min(1),
  shape: z.enum(['line', 'dash', 'dot', 'band', 'swatch']).optional(),
  color: z.string().optional()
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
    .object({
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

const statCard = z.object({
  ...base,
  kind: z.literal('stat'),
  value: z.union([z.number(), z.string()]),
  format: valueFormat.optional(),
  delta: delta.optional(),
  trend: z.array(z.number()).optional(),
  reference: z
    .object({ value: z.number(), label: z.string().min(1) })
    .optional(),
  source: z.string().optional()
})

const tableCard = z.object({
  ...base,
  ...headline,
  kind: z.literal('table'),
  columns: tableData.shape.columns,
  rows: tableData.shape.rows,
  source: z.string().min(1)
})

const chartCard = z.object({
  ...base,
  ...headline,
  kind: z.literal('chart'),
  plot: staticPlot,
  table: tableData,
  legend: z.array(legendItem).optional(),
  view: z.enum(['chart', 'table']).optional(),
  source: z.string().min(1)
})

const noteCard = z.object({
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

const section = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  cards: z.array(card)
})

export const dashboardSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  sections: z.array(section).min(1)
})

export type DeltaSpec = z.infer<typeof delta>
export type TableColumn = z.infer<typeof column>
export type TableCell = z.infer<typeof cell>
export type TableRow = Record<string, TableCell>
export type TableData = z.infer<typeof tableData>
export type StaticPlot = z.infer<typeof staticPlot>
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
