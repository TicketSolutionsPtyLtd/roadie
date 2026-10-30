import type { core } from 'zod'

import { isWallTime, parseWallTime } from '../dataviz/wallTime'
import {
  type ChartPlot,
  type PlotRow,
  SERIES_CAP,
  type SmallMultiplesPlot,
  type StackedAreaPlot
} from './plots'

export type DashboardProblem = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

const DASH = /[–—]|\s-\s/
const TITLE_CASE = /^(?:\S+\s+)(?:[A-Z][a-z]{3,}\s*){2,}/

const toPath = (segments: readonly PropertyKey[]) =>
  segments.reduce<string>(
    (path, segment) =>
      typeof segment === 'number'
        ? `${path}[${segment}]`
        : path
          ? `${path}.${String(segment)}`
          : String(segment),
    ''
  )

export const error = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'error'
})
export const warning = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'warning'
})

export function schemaProblems(issues: readonly core.$ZodIssue[]) {
  return issues.map((issue) => error(toPath(issue.path), issue.message))
}

export const joinPath = (path: string, field: string) =>
  path ? `${path}.${field}` : field

export function copyProblems(
  path: string,
  field: string,
  text: string | undefined
) {
  if (!text) return []
  const at = joinPath(path, field)
  const problems: DashboardProblem[] = []
  if (DASH.test(text))
    problems.push(warning(at, 'Use "to" or a full stop instead of a dash'))
  if (TITLE_CASE.test(text)) problems.push(warning(at, 'Use sentence case'))
  return problems
}

type Headline = {
  label: string
  context?: string
  value?: number | string
  takeaway?: string
}

export const valueOrTakeawayProblems = (card: Headline, path: string) =>
  card.value !== undefined && card.takeaway
    ? [
        error(
          joinPath(path, 'takeaway'),
          'Use a value with a delta, or a takeaway, not both'
        )
      ]
    : []

export const headlineCopyProblems = (card: Headline, path: string) => [
  ...copyProblems(path, 'label', card.label),
  ...copyProblems(path, 'context', card.context),
  ...copyProblems(path, 'takeaway', card.takeaway)
]

type FieldRef = { key: string; field: string }

export function plotFields(plot: ChartPlot): FieldRef[] {
  const refs: FieldRef[] = []
  const add = (key: string, field: string | undefined) => {
    if (field) refs.push({ key, field })
  }
  switch (plot.kind) {
    case 'line':
      add('x', plot.x)
      add('y', plot.y)
      add('series', plot.series)
      add('band.low', plot.band?.low)
      add('band.high', plot.band?.high)
      add('band.median', plot.band?.median)
      add('forecast.low', plot.forecast?.low)
      add('forecast.high', plot.forecast?.high)
      add('comparison.y', plot.comparison?.y)
      break
    case 'bar':
      add('x', plot.x)
      add('y', plot.y)
      add('line.y', plot.line?.y)
      add('comparison.y', plot.comparison?.y)
      break
    case 'ranked-bars':
      add('x', plot.x)
      add('y', plot.y)
      add('reference.field', plot.reference?.field)
      break
    case 'stacked-bars':
    case 'stacked-area':
      add('x', plot.x)
      add('y', plot.y)
      add('series', plot.series)
      break
    case 'histogram':
      add('x', plot.x)
      break
    case 'heatmap':
      add('rows', plot.rows)
      add('columns', plot.columns)
      add('value', plot.value)
      break
    case 'scatter':
      add('x', plot.x)
      add('y', plot.y)
      add('size', plot.size)
      add('label', plot.label)
      break
    case 'small-multiples':
      add('by', plot.by)
      for (const ref of plotFields({ ...plot.chart, data: plot.data }))
        add(`chart.${ref.key}`, ref.field)
      break
    case 'funnel':
      break
  }
  return refs
}

function seriesCount(plot: ChartPlot) {
  if (
    (plot.kind !== 'line' &&
      plot.kind !== 'stacked-bars' &&
      plot.kind !== 'stacked-area') ||
    !plot.series
  )
    return 0
  const field = plot.series
  return new Set(plot.data.map((row) => row[field])).size
}

const INTERVAL_MS = { hour: 3_600_000, day: 86_400_000, week: 604_800_000 }

type AnnotatedChart = SmallMultiplesPlot['chart'] | StackedAreaPlot

// A spread into Math.min or Math.max overflows the call stack on large data.
function minMax(values: readonly number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return [min, max]
}

// A stacked area drops a row with no value or series, so its x span comes from
// the rest; lines and bars keep a slot for a missing value.
const drawnRows = (chart: AnnotatedChart, data: readonly PlotRow[]) =>
  chart.kind === 'stacked-area'
    ? data.filter((row) => {
        const y = row[chart.y]
        const series = row[chart.series]
        return (
          typeof y === 'number' &&
          Number.isFinite(y) &&
          series != null &&
          String(series) !== ''
        )
      })
    : data

// Mirrors how the charts place annotations: by wall time on a time axis, where
// a bar covers its whole interval, and by exact value otherwise.
function annotationFits(
  at: string | number,
  chart: AnnotatedChart,
  data: readonly PlotRow[]
) {
  const xs = drawnRows(chart, data)
    .map((row) => row[chart.x])
    .filter((v) => v != null)
  if (xs.length === 0) return true
  if (xs.every(isWallTime)) {
    const time = parseWallTime(at)
    const times = xs.map(parseWallTime).filter((v) => v !== null)
    const [first, last] = minMax(times)
    const span = chart.kind === 'bar' ? INTERVAL_MS[chart.interval ?? 'day'] : 0
    return (
      time !== null &&
      time >= first &&
      (span ? time < last + span : time <= last)
    )
  }
  if (chart.kind === 'bar') return xs.some((x) => String(x) === String(at))
  const [low, high] = minMax(xs.filter((x) => typeof x === 'number'))
  return typeof at === 'number' && at >= low && at <= high
}

// Small multiples draw each panel from its own rows, so an annotation needs one
// panel that places it, not just a place somewhere in all the data.
function panelRows(data: readonly PlotRow[], by: string) {
  const panels = new Map<string, PlotRow[]>()
  for (const row of data) {
    const key = row[by]
    if (key == null) continue
    const rows = panels.get(String(key)) ?? []
    rows.push(row)
    panels.set(String(key), rows)
  }
  return [...panels.values()]
}

const fitsAnyPanel = (
  at: string | number,
  chart: AnnotatedChart,
  panels: readonly (readonly PlotRow[])[]
) =>
  panels.length === 0 || panels.some((rows) => annotationFits(at, chart, rows))

function annotationProblems(
  chart: AnnotatedChart,
  panels: readonly (readonly PlotRow[])[],
  path: string
) {
  return (chart.annotations ?? []).flatMap((annotation, i) => {
    const at = `${path}.annotations[${i}]`
    return [
      ...copyProblems(at, 'label', annotation.label),
      ...(fitsAnyPanel(annotation.at, chart, panels)
        ? []
        : [
            warning(
              `${at}.at`,
              `"${annotation.at}" is outside the data, so the annotation won't show`
            )
          ])
    ]
  })
}

function repeats(keys: readonly string[]) {
  return [...new Set(keys.filter((key, i) => keys.indexOf(key) !== i))]
}

// Time keys repeat by wall time, so "2026-10-01" and "2026-10-01T00:00" do.
function repeatedX(data: readonly PlotRow[], field: string) {
  const xs = data.flatMap((row) => (row[field] == null ? [] : [row[field]]))
  const time = xs.every(isWallTime)
  const firstOf = new Map<string, string>()
  const keys = xs.map((x) => {
    const key = time ? String(parseWallTime(x)) : String(x)
    if (!firstOf.has(key)) firstOf.set(key, String(x))
    return key
  })
  return repeats(keys).map((key) => firstOf.get(key)!)
}

const addsUp = (
  path: string,
  repeated: readonly string[],
  outcome = 'Its rows will add up'
) =>
  repeated.length
    ? [warning(path, `${quoted(repeated)} appears more than once. ${outcome}`)]
    : []

const barOutcome = (plot: { line?: unknown }) =>
  plot.line
    ? 'Its bars will add up and its line keeps the first value it has'
    : undefined

export const quoted = (names: readonly string[]) =>
  names.map((name) => `"${name}"`).join(', ')

function duplicateProblems(plot: ChartPlot, plotPath: string) {
  switch (plot.kind) {
    case 'funnel': {
      const repeated = repeats(plot.steps.map((step) => step.label))
      return repeated.length
        ? [
            error(
              `${plotPath}.steps`,
              `Step labels must differ. ${quoted(repeated)} repeats`
            )
          ]
        : []
    }
    case 'ranked-bars':
      return addsUp(`${plotPath}.x`, repeatedX(plot.data, plot.x))
    case 'bar':
      return addsUp(
        `${plotPath}.x`,
        repeatedX(plot.data, plot.x),
        barOutcome(plot)
      )
    case 'small-multiples': {
      if (plot.chart.kind !== 'bar') return []
      const { x } = plot.chart
      const panels = [...new Set(plot.data.map((row) => row[plot.by]))]
      return addsUp(
        `${plotPath}.chart.x`,
        panels.flatMap((panel) =>
          repeatedX(
            plot.data.filter((row) => row[plot.by] === panel),
            x
          )
        ),
        barOutcome(plot.chart)
      )
    }
    case 'heatmap': {
      const repeated = repeats(
        plot.data.map(
          (row) => `${row[plot.rows] ?? ''}, ${row[plot.columns] ?? ''}`
        )
      )
      return repeated.length
        ? [
            warning(
              `${plotPath}.data`,
              `More than one row for ${quoted(repeated)}. Their values will add up`
            )
          ]
        : []
    }
    default:
      return []
  }
}

export function plotProblems(plot: ChartPlot, plotPath: string) {
  const problems: DashboardProblem[] = []
  if ('data' in plot && plot.data.length > 0)
    for (const { key, field } of plotFields(plot))
      if (!plot.data.some((row) => field in row))
        problems.push(
          error(`${plotPath}.${key}`, `No row has a "${field}" field`)
        )
  if (plot.kind === 'histogram' && plot.bins && plot.binWidth)
    problems.push(error(`${plotPath}.bins`, 'Use bins or binWidth, not both'))
  const count = seriesCount(plot)
  if (count > SERIES_CAP)
    problems.push(
      warning(
        `${plotPath}.series`,
        `${count} series. The smallest will roll into Other after ${SERIES_CAP}`
      )
    )
  if (
    plot.kind === 'ranked-bars' &&
    plot.other === false &&
    plot.limit === undefined
  )
    problems.push(
      warning(
        `${plotPath}.limit`,
        'Set limit too, so the label can say how many bars show'
      )
    )
  const chart = plot.kind === 'small-multiples' ? plot.chart : plot
  const chartPath =
    plot.kind === 'small-multiples' ? `${plotPath}.chart` : plotPath
  if (chart.kind === 'line' && chart.comparison && chart.series)
    problems.push(
      warning(
        `${chartPath}.comparison`,
        'A comparison draws only on a single series, so the chart leaves it out. Drop series or comparison'
      )
    )
  if (
    (plot.kind === 'line' || plot.kind === 'bar') &&
    (plot.comparison?.y === plot.x || plot.comparison?.y === plot.y)
  )
    problems.push(
      warning(
        `${plotPath}.comparison.y`,
        `"${plot.comparison.y}" is the chart's own x or y, so the chart leaves the comparison out. Name another field`
      )
    )
  problems.push(...copyProblems(plotPath, 'takeaway', plot.takeaway))
  problems.push(...duplicateProblems(plot, plotPath))
  if (
    plot.kind === 'line' ||
    plot.kind === 'bar' ||
    plot.kind === 'stacked-area'
  )
    problems.push(...annotationProblems(plot, [plot.data], plotPath))
  if (plot.kind === 'small-multiples')
    problems.push(
      ...annotationProblems(
        plot.chart,
        panelRows(plot.data, plot.by),
        `${plotPath}.chart`
      )
    )
  return problems
}
