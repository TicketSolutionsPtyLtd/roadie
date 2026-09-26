import { z } from 'zod'

import { valueFormat } from './fields'

export const ANNOTATION_LABEL_LIMIT = 20
export const SERIES_CAP = 6

const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript):/i
const safeUrl = z
  .string()
  .min(1)
  .refine((url) => !UNSAFE_SCHEME.test(url), {
    message: 'Use an http(s) or relative image URL'
  })
const plotImage = { src: safeUrl, srcDark: safeUrl.optional() }

export const staticPlotSchema = z.strictObject({
  kind: z.literal('static'),
  ...plotImage,
  alt: z.string().min(1),
  narrow: z.strictObject(plotImage).optional(),
  wide: z.strictObject(plotImage).optional()
})

const field = z.string().min(1)
const shortLabel = z
  .string()
  .min(1)
  .max(
    ANNOTATION_LABEL_LIMIT,
    `Keep it to ${ANNOTATION_LABEL_LIMIT} characters`
  )
const plotX = z.union([z.string().min(1), z.number()])
const plotRow = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
)
const annotation = z.strictObject({ at: plotX, label: shortLabel })
const highlight = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1)
])
const palette = z.enum(['categorical', 'pair', 'trio'])

const common = {
  format: valueFormat.optional(),
  takeaway: z.string().min(1).optional()
}
const measured = { data: z.array(plotRow), x: field, y: field, ...common }

const lineShape = {
  kind: z.literal('line'),
  ...measured,
  series: field.optional(),
  highlight: highlight.optional(),
  palette: palette.optional(),
  annotations: z.array(annotation).optional(),
  area: z.boolean().optional(),
  cumulative: z.boolean().optional(),
  band: z
    .strictObject({
      low: field,
      high: field,
      median: field.optional(),
      label: shortLabel.optional()
    })
    .optional(),
  forecast: z
    .strictObject({
      from: plotX,
      low: field.optional(),
      high: field.optional()
    })
    .optional(),
  target: z.number().optional(),
  today: plotX.optional()
}

const barShape = {
  kind: z.literal('bar'),
  ...measured,
  annotations: z.array(annotation).optional(),
  interval: z.enum(['hour', 'day', 'week']).optional(),
  line: z
    .strictObject({
      y: field,
      label: shortLabel,
      format: valueFormat.optional()
    })
    .optional()
}

export const linePlotSchema = z.strictObject(lineShape)
export const barPlotSchema = z.strictObject(barShape)

export const rankedBarsPlotSchema = z.strictObject({
  kind: z.literal('ranked-bars'),
  ...measured,
  highlight: highlight.optional(),
  limit: z.number().int().min(1).max(20).optional(),
  reference: z.strictObject({ field, label: shortLabel }).optional(),
  share: z.boolean().optional()
})

export const stackedBarsPlotSchema = z.strictObject({
  kind: z.literal('stacked-bars'),
  ...measured,
  series: field,
  highlight: highlight.optional(),
  palette: palette.optional(),
  mode: z.enum(['count', 'share']).optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional()
})

export const histogramPlotSchema = z.strictObject({
  kind: z.literal('histogram'),
  data: z.array(plotRow),
  x: field,
  ...common,
  bins: z.number().int().min(2).max(50).optional(),
  binWidth: z.number().positive().optional(),
  median: z.boolean().optional()
})

export const funnelPlotSchema = z.strictObject({
  kind: z.literal('funnel'),
  steps: z
    .array(
      z.strictObject({ label: z.string().min(1), value: z.number().min(0) })
    )
    .min(2),
  ...common
})

export const heatmapPlotSchema = z.strictObject({
  kind: z.literal('heatmap'),
  data: z.array(plotRow),
  rows: field,
  columns: field,
  value: field,
  scale: z.enum(['sequential', 'diverging']).optional(),
  ...common
})

export const scatterPlotSchema = z.strictObject({
  kind: z.literal('scatter'),
  ...measured,
  xFormat: valueFormat.optional(),
  size: field.optional(),
  label: field.optional(),
  highlight: highlight.optional(),
  quadrants: z
    .strictObject({
      x: z.number(),
      y: z.number(),
      labels: z.strictObject({
        topLeft: shortLabel,
        topRight: shortLabel,
        bottomLeft: shortLabel,
        bottomRight: shortLabel
      })
    })
    .optional()
})

export const smallMultiplesPlotSchema = z.strictObject({
  kind: z.literal('small-multiples'),
  data: z.array(plotRow),
  by: field,
  chart: z.discriminatedUnion('kind', [
    linePlotSchema.omit({ data: true }),
    barPlotSchema.omit({ data: true })
  ]),
  shared: z.boolean().optional(),
  takeaway: z.string().min(1).optional()
})

const chartPlots = [
  linePlotSchema,
  barPlotSchema,
  rankedBarsPlotSchema,
  stackedBarsPlotSchema,
  histogramPlotSchema,
  funnelPlotSchema,
  heatmapPlotSchema,
  scatterPlotSchema,
  smallMultiplesPlotSchema
] as const

export const chartPlotSchema = z.discriminatedUnion('kind', [...chartPlots])
export const plotSchema = z.discriminatedUnion('kind', [
  staticPlotSchema,
  ...chartPlots
])

export const CHART_PLOT_KINDS = [
  'line',
  'bar',
  'ranked-bars',
  'stacked-bars',
  'histogram',
  'funnel',
  'heatmap',
  'scatter',
  'small-multiples'
] as const

export type PlotCell = string | number | null
export type PlotRow = Record<string, PlotCell>
export type PlotX = z.infer<typeof plotX>
export type PlotAnnotation = z.infer<typeof annotation>
export type StaticPlot = z.infer<typeof staticPlotSchema>
export type StaticPlotImage = NonNullable<StaticPlot['narrow']>
export type LinePlot = z.infer<typeof linePlotSchema>
export type BarPlot = z.infer<typeof barPlotSchema>
export type RankedBarsPlot = z.infer<typeof rankedBarsPlotSchema>
export type StackedBarsPlot = z.infer<typeof stackedBarsPlotSchema>
export type HistogramPlot = z.infer<typeof histogramPlotSchema>
export type FunnelPlot = z.infer<typeof funnelPlotSchema>
export type HeatmapPlot = z.infer<typeof heatmapPlotSchema>
export type ScatterPlot = z.infer<typeof scatterPlotSchema>
export type SmallMultiplesPlot = z.infer<typeof smallMultiplesPlotSchema>
export type ChartPlot = z.infer<typeof chartPlotSchema>
export type Plot = z.infer<typeof plotSchema>
export type ChartPlotKind = ChartPlot['kind']
export type PlotProps<K extends ChartPlotKind> = Omit<
  Extract<ChartPlot, { kind: K }>,
  'kind'
>
