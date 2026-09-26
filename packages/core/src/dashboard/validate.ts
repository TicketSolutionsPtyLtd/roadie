import type { core } from 'zod'

import { isWallTime, parseWallTime } from '../dataviz/wallTime'
import {
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  type CardKind,
  type CardSize,
  findRowGaps
} from './layout'
import {
  type ChartPlot,
  type PlotRow,
  SERIES_CAP,
  type SmallMultiplesPlot
} from './plots'
import {
  type DashboardCard,
  type DashboardSpec,
  dashboardSchema
} from './schema'

export type DashboardProblem = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type DashboardValidation =
  | { ok: true; dashboard: DashboardSpec; problems: DashboardProblem[] }
  | { ok: false; problems: DashboardProblem[] }

const ALLOWED_SIZES: Record<CardKind, readonly CardSize[]> = {
  stat: ['stat'],
  table: ['sm', 'md', 'lg', 'full'],
  chart: ['sm', 'md', 'lg', 'full'],
  note: ['sm', 'md', 'lg', 'full']
}

const MAX_VISUAL_COLUMNS = 2
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

const error = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'error'
})
const warning = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'warning'
})

function schemaProblems(issues: readonly core.$ZodIssue[]) {
  return issues.map((issue) => error(toPath(issue.path), issue.message))
}

function copyProblems(path: string, field: string, text: string | undefined) {
  if (!text) return []
  const problems: DashboardProblem[] = []
  if (DASH.test(text))
    problems.push(
      warning(`${path}.${field}`, 'Use "to" or a full stop instead of a dash')
    )
  if (TITLE_CASE.test(text))
    problems.push(warning(`${path}.${field}`, 'Use sentence case'))
  return problems
}

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
      break
    case 'bar':
      add('x', plot.x)
      add('y', plot.y)
      add('line.y', plot.line?.y)
      break
    case 'ranked-bars':
      add('x', plot.x)
      add('y', plot.y)
      add('reference.field', plot.reference?.field)
      break
    case 'stacked-bars':
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
      add('chart.x', plot.chart.x)
      add('chart.y', plot.chart.y)
      break
    case 'funnel':
      break
  }
  return refs
}

function seriesCount(plot: ChartPlot) {
  if ((plot.kind !== 'line' && plot.kind !== 'stacked-bars') || !plot.series)
    return 0
  const field = plot.series
  return new Set(plot.data.map((row) => row[field])).size
}

const INTERVAL_MS = { hour: 3_600_000, day: 86_400_000, week: 604_800_000 }

type AnnotatedChart = SmallMultiplesPlot['chart']

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

// Mirrors how the charts place annotations: by wall time on a time axis, where
// a bar covers its whole interval, and by exact value otherwise.
function annotationFits(
  at: string | number,
  chart: AnnotatedChart,
  data: readonly PlotRow[]
) {
  const xs = data.map((row) => row[chart.x]).filter((v) => v != null)
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

function annotationProblems(
  chart: AnnotatedChart,
  data: readonly PlotRow[],
  path: string
) {
  return (chart.annotations ?? []).flatMap((annotation, i) => {
    const at = `${path}.annotations[${i}]`
    return [
      ...copyProblems(at, 'label', annotation.label),
      ...(annotationFits(annotation.at, chart, data)
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

const quoted = (names: readonly string[]) =>
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

function plotProblems(plot: ChartPlot, path: string) {
  const problems: DashboardProblem[] = []
  const plotPath = `${path}.plot`
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
  problems.push(...copyProblems(plotPath, 'takeaway', plot.takeaway))
  problems.push(...duplicateProblems(plot, plotPath))
  if (plot.kind === 'line' || plot.kind === 'bar')
    problems.push(...annotationProblems(plot, plot.data, plotPath))
  if (plot.kind === 'small-multiples')
    problems.push(
      ...annotationProblems(plot.chart, plot.data, `${plotPath}.chart`)
    )
  return problems
}

function cardProblems(card: DashboardCard, path: string) {
  const problems: DashboardProblem[] = []
  if (!ALLOWED_SIZES[card.kind].includes(card.size))
    problems.push(
      error(
        `${path}.size`,
        `A ${card.kind} card can't be ${card.size}. Use ${ALLOWED_SIZES[card.kind].join(', ')}`
      )
    )

  const limits = COPY_LIMITS[card.size]
  const labelLimit =
    card.kind === 'chart' && card.size !== 'stat'
      ? CHART_LABEL_LIMITS[card.size]
      : limits.label
  if (card.label.length > labelLimit)
    problems.push(
      warning(
        `${path}.label`,
        `${card.label.length} characters, will truncate at ${card.size} size (limit ${labelLimit})`
      )
    )
  if (card.context && card.context.length > limits.context)
    problems.push(
      warning(
        `${path}.context`,
        `${card.context.length} characters, will truncate at ${card.size} size (limit ${limits.context})`
      )
    )

  if (
    (card.kind === 'chart' || card.kind === 'table') &&
    card.value !== undefined &&
    card.takeaway
  )
    problems.push(
      error(
        `${path}.takeaway`,
        'Use a value with a delta, or a takeaway, not both'
      )
    )

  const columns =
    card.kind === 'table'
      ? card.columns
      : card.kind === 'chart'
        ? (card.table?.columns ?? [])
        : []
  const visual = columns.filter(
    (column) => column.kind === 'sparkline' || column.kind === 'meter'
  )
  if (visual.length > MAX_VISUAL_COLUMNS)
    problems.push(
      error(
        `${path}.${card.kind === 'chart' ? 'table.columns' : 'columns'}`,
        `At most ${MAX_VISUAL_COLUMNS} sparkline or meter columns`
      )
    )

  problems.push(...copyProblems(path, 'label', card.label))
  problems.push(...copyProblems(path, 'context', card.context))
  if (card.kind === 'chart' || card.kind === 'table')
    problems.push(...copyProblems(path, 'takeaway', card.takeaway))
  if (card.kind === 'note')
    problems.push(...copyProblems(path, 'body', card.body))
  if (card.kind === 'chart' && card.plot.kind !== 'static')
    problems.push(...plotProblems(card.plot, path))
  if (card.kind === 'chart')
    card.legend?.forEach((item, i) => {
      if (item.median && item.shape !== 'band')
        problems.push(
          warning(
            `${path}.legend[${i}].median`,
            'A median draws only through a band key; set shape to band'
          )
        )
    })
  return problems
}

export function validateDashboard(input: unknown): DashboardValidation {
  const parsed = dashboardSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, problems: schemaProblems(parsed.error.issues) }

  const dashboard = parsed.data
  const problems: DashboardProblem[] = []
  const seen = new Set<string>()

  dashboard.sections.forEach((section, s) => {
    const sectionPath = `sections[${s}]`
    problems.push(...copyProblems(sectionPath, 'title', section.title))
    section.cards.forEach((card, c) => {
      const path = `${sectionPath}.cards[${c}]`
      if (seen.has(card.id))
        problems.push(error(`${path}.id`, `Duplicate id "${card.id}"`))
      seen.add(card.id)
      problems.push(...cardProblems(card, path))
    })
    for (const gap of findRowGaps(section.cards))
      problems.push(
        warning(
          sectionPath,
          `Row ${gap.row + 1} leaves ${gap.emptyTracks} empty column${gap.emptyTracks === 1 ? '' : 's'} on ${gap.width} after ${gap.ids.join(', ')}`
        )
      )
  })

  return problems.some((problem) => problem.severity === 'error')
    ? { ok: false, problems }
    : { ok: true, dashboard, problems }
}
