import {
  type ChartDocument,
  type ChartPlotKind,
  type DashboardProblem,
  type PlotProps,
  type StaticPlot,
  validateChartDocument
} from '@oztix/roadie-core/dashboard'
import {
  type Mode,
  deltaSentiment,
  formatDelta,
  formatValue
} from '@oztix/roadie-core/dataviz'

import { barChart } from '../BarChart/definition'
import { donutChartTable } from '../DonutChart/table'
import { funnel } from '../Funnel/definition'
import { heatmap } from '../Heatmap/definition'
import { histogram } from '../Histogram/definition'
import { lineChart } from '../LineChart/definition'
import { rankedBars } from '../RankedBars/definition'
import { scatter } from '../Scatter/definition'
import { renderSmallMultiplesSvg } from '../SmallMultiples/static'
import { stackedArea } from '../StackedArea/definition'
import { stackedBars } from '../StackedBars/definition'
import { fitLines, labelWidth } from '../plot/categoryLabels'
import { plotFrame, widthBand } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { FONT_FAMILY, SVG_NS, escapeXml } from '../plot/svg'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { renderChartSvg } from './index'

/** @beta The chart document's shape may change. */
export type ChartDocumentRenderOptions = {
  mode: Mode
  width: number
  height: number
  accentHue?: number
}

/**
 * Thrown by `renderChartDocument` for a document that fails
 * `validateChartDocument`, with every problem it found.
 *
 * @beta
 */
export class ChartDocumentError extends Error {
  readonly problems: DashboardProblem[]

  constructor(problems: DashboardProblem[]) {
    const errors = problems.filter((problem) => problem.severity === 'error')
    super(
      `Invalid chart document: ${errors
        .map((problem) => `${problem.path || 'document'}: ${problem.message}`)
        .join('; ')}`
    )
    this.name = 'ChartDocumentError'
    this.problems = problems
  }
}

type DrawnKind = Exclude<ChartPlotKind, 'small-multiples'>

// Until the donut's definition lands, a donut plot draws as a chart that
// couldn't be drawn, the same as a dashboard donut card.
const undrawnDonut: ChartDefinition<PlotProps<'donut'>> = {
  kind: 'donut',
  build() {
    throw new Error('The donut chart is not drawn yet')
  },
  table: donutChartTable,
  summary: (props) => props.takeaway ?? '',
  emptyMessage: () => undefined,
  legend: () => [],
  describe: (datum) => String(datum.x),
  tooltip: () => ({ title: '', rows: [] })
}

// Definitions, not components, so /static never loads React.
const DEFINITIONS: { [K in DrawnKind]: ChartDefinition<PlotProps<K>> } = {
  line: lineChart,
  bar: barChart,
  'ranked-bars': rankedBars,
  donut: undrawnDonut,
  'stacked-bars': stackedBars,
  'stacked-area': stackedArea,
  histogram,
  funnel,
  heatmap,
  scatter
}

const PADDING = 16
const GAP = 12
const LABEL_SIZE = 14
const VALUE_SIZE = 28
const LEADING = 1.4
const DELTA_GAP = 8
const MIN_PLOT_HEIGHT = 120
// The width estimates are for regular text, and bold runs about this much wider.
const BOLD_WIDTH = 1.08

type Line = { text: string; size: number; fill: string; weight?: number }
type Placed = Line & { x: number; y: number }

const sized = (frame: PlotFrame, size: number): PlotFrame => ({
  ...frame,
  fontSize: size
})

const wrapped = (
  text: string,
  width: number,
  frame: PlotFrame,
  style: Omit<Line, 'text'>
): Line[] =>
  fitLines(text, room(width, style.weight), sized(frame, style.size), 2).map(
    (line) => ({
      ...style,
      text: line
    })
  )

const room = (width: number, weight = 400) =>
  weight >= 600 ? width / BOLD_WIDTH : width

const round = (n: number) => Math.round(n * 10) / 10

const textTag = ({ text, size, fill, weight, x, y }: Placed) =>
  `<text x="${round(x)}" y="${round(y)}" font-size="${size}"${weight ? ` font-weight="${weight}"` : ''} fill="${fill}">${escapeXml(text)}</text>`

function stack(lines: readonly Line[], top: number) {
  let y = top
  const placed = lines.map((line) => {
    y += line.size * LEADING
    return textTag({ ...line, x: PADDING, y: y - line.size * 0.3 })
  })
  return { markup: placed.join(''), bottom: y }
}

function deltaText(
  doc: ChartDocument,
  delta: NonNullable<ChartDocument['delta']>,
  paint: ChartPaint
) {
  const ownFormat = delta.format !== undefined
  const format = ownFormat ? delta.format : doc.format
  const options = {
    decimals: ownFormat ? delta.decimals : (delta.decimals ?? doc.decimals),
    trailingZeroDisplay: ownFormat
      ? delta.trailingZeroDisplay
      : (delta.trailingZeroDisplay ?? doc.trailingZeroDisplay)
  }
  const change =
    delta.baseline === undefined ? delta.value : delta.value - delta.baseline
  const shown =
    change === 0
      ? 'No change'
      : `${change > 0 ? '↑' : '↓'} ${
          delta.baseline === undefined
            ? formatDelta(delta.value, format, options)
            : formatValue(delta.value, format, options)
        }`
  const sentiment = deltaSentiment(change, delta.goodWhen)
  const fill =
    sentiment === 'good'
      ? paint.status.good
      : sentiment === 'bad'
        ? paint.status.critical
        : paint.label
  return { shown, fill }
}

function headline(
  doc: ChartDocument,
  top: number,
  frame: PlotFrame,
  paint: ChartPaint,
  width: number
) {
  if (doc.value === undefined) {
    if (!doc.takeaway) return { markup: '', bottom: top }
    return stack(
      wrapped(doc.takeaway, width, frame, {
        size: LABEL_SIZE,
        fill: paint.value
      }),
      top
    )
  }
  const shown =
    typeof doc.value === 'number'
      ? formatValue(doc.value, doc.format, {
          decimals: doc.decimals,
          trailingZeroDisplay: doc.trailingZeroDisplay
        })
      : doc.value
  const y = top + VALUE_SIZE * LEADING - VALUE_SIZE * 0.3
  const delta = doc.delta && deltaText(doc, doc.delta, paint)
  const deltaRoom = delta
    ? labelWidth(delta.shown, sized(frame, LABEL_SIZE)) * BOLD_WIDTH + DELTA_GAP
    : 0
  const valueFrame = sized(frame, VALUE_SIZE)
  const [value = shown] = fitLines(
    shown,
    room(width - deltaRoom, 700),
    valueFrame,
    1
  )
  let markup = textTag({
    text: value,
    size: VALUE_SIZE,
    weight: 700,
    fill: paint.value,
    x: PADDING,
    y
  })
  if (delta)
    markup += textTag({
      text: delta.shown,
      size: LABEL_SIZE,
      weight: 600,
      fill: delta.fill,
      x: PADDING + labelWidth(value, valueFrame) * BOLD_WIDTH + DELTA_GAP,
      y
    })
  return { markup, bottom: top + VALUE_SIZE * LEADING }
}

type Slot = { x: number; y: number; width: number; height: number }

const placed = (svg: string, { x, y }: Slot) =>
  svg.replace('<svg ', `<svg x="${x}" y="${y}" `)

function staticImage(plot: StaticPlot, mode: Mode, slot: Slot) {
  const band = widthBand(slot.width)
  const image =
    (band === 'narrow' && plot.narrow) || (band === 'wide' && plot.wide) || plot
  const href = mode === 'dark' && image.srcDark ? image.srcDark : image.src
  return `<image x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" href="${escapeXml(href)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(plot.alt)}"/>`
}

function drawPlot(
  plot: ChartDocument['plot'],
  takeaway: string | undefined,
  { mode, accentHue }: ChartDocumentRenderOptions,
  slot: Slot
) {
  if (plot.kind === 'static') return staticImage(plot, mode, slot)
  const { kind, ...rest } = plot
  const props = { ...rest, takeaway: plot.takeaway ?? takeaway }
  if (kind === 'small-multiples') {
    const svg = renderSmallMultiplesSvg(props as PlotProps<'small-multiples'>, {
      mode,
      accentHue,
      width: slot.width
    })
    // Its panels set its height, so it scales down to fit the slot.
    return placed(
      svg.replace(
        /width="[^"]*" height="[^"]*"/,
        `width="${slot.width}" height="${slot.height}" preserveAspectRatio="xMinYMin meet"`
      ),
      slot
    )
  }
  const chart = DEFINITIONS[kind] as ChartDefinition<typeof props>
  return placed(
    renderChartSvg(chart, props, {
      mode,
      accentHue,
      width: slot.width,
      height: slot.height,
      idPrefix: `document-${kind}`
    }),
    slot
  )
}

// The file is one image to assistive tech, so the plot's own name goes unread.
function description({ plot, takeaway }: ChartDocument) {
  const text = plot.kind === 'static' ? plot.alt : (plot.takeaway ?? takeaway)
  return text ? `<desc>${escapeXml(text)}</desc>` : ''
}

/**
 * Draws a chart document as one standalone SVG file: its label, context, and
 * headline above the plot, and its source below. Validates the document
 * first, and throws a `ChartDocumentError` if it has errors, or a
 * `RangeError` if the size leaves the plot under 120px tall.
 *
 * @beta The chart document's shape may change until the documents package
 * agrees with it.
 */
export function renderChartDocument(
  doc: ChartDocument,
  options: ChartDocumentRenderOptions
): string {
  const result = validateChartDocument(doc)
  if (!result.ok) throw new ChartDocumentError(result.problems)
  const { document } = result
  const { mode, accentHue, width, height } = options
  const paint = hexPaint(mode, accentHue)
  const frame = plotFrame(height, widthBand(width), undefined, width)
  const inner = width - PADDING * 2

  const heading = stack(
    [
      ...wrapped(document.label, inner, frame, {
        size: LABEL_SIZE,
        weight: 600,
        fill: paint.value
      }),
      ...(document.context
        ? wrapped(document.context, inner, frame, {
            size: frame.fontSize,
            fill: paint.label
          })
        : [])
    ],
    PADDING
  )
  const lead = headline(document, heading.bottom, frame, paint, inner)
  const sourceLines = wrapped(document.source, inner, frame, {
    size: frame.fontSize,
    fill: paint.label
  })
  const sourceHeight = sourceLines.reduce(
    (sum, line) => sum + line.size * LEADING,
    0
  )
  const source = stack(sourceLines, height - PADDING - sourceHeight)
  const top = lead.bottom + GAP
  const slot = {
    x: PADDING,
    y: round(top),
    width: inner,
    height: round(Math.max(0, height - PADDING - sourceHeight - GAP - top))
  }
  if (slot.height < MIN_PLOT_HEIGHT)
    throw new RangeError(
      `A ${width} by ${height} chart document leaves ${slot.height}px for its plot. Give it at least ${MIN_PLOT_HEIGHT}px`
    )
  const plot = drawPlot(document.plot, document.takeaway, options, slot)
  return `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(document.label)}" style="font-family:${FONT_FAMILY};font-variant-numeric:tabular-nums">${description(document)}<rect width="${width}" height="${height}" fill="${paint.surface}"/>${heading.markup}${lead.markup}${plot}${source.markup}</svg>`
}
