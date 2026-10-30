import { isWallTime } from '../dataviz/wallTime'
import { compareDates, isPlainDate } from '../datetime/plainDate'
import {
  type Comparison,
  type DateRangeValue,
  isAbsoluteRange,
  isBuiltInComparison,
  isRollingRange
} from '../datetime/ranges'
import {
  type DashboardProblem,
  columnProblems,
  copyProblems,
  error,
  headlineCopyProblems,
  plotProblems,
  schemaProblems,
  valueOrTakeawayProblems,
  warning
} from './cardChecks'
import {
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  type CardKind,
  type CardSize,
  findRowGaps
} from './layout'
import type { ChartPlot } from './plots'
import {
  type DashboardCard,
  type DashboardPeriodSpec,
  type DashboardSpec,
  type TableColumn,
  dashboardSchema
} from './schema'
import { isSummable, tableLabelIndex } from './totals'

export { plotFields } from './cardChecks'
export type { DashboardProblem } from './cardChecks'

export type DashboardValidation =
  | { ok: true; dashboard: DashboardSpec; problems: DashboardProblem[] }
  | { ok: false; problems: DashboardProblem[] }

const ALLOWED_SIZES: Record<CardKind, readonly CardSize[]> = {
  stat: ['stat'],
  table: ['sm', 'md', 'lg', 'full'],
  chart: ['sm', 'md', 'lg', 'full'],
  note: ['sm', 'md', 'lg', 'full']
}

function totalsProblems(
  card: Extract<DashboardCard, { kind: 'table' }>,
  path: string
) {
  const { totals } = card
  if (!totals) return []
  const at = `${path}.totals`
  const given = totals === 'sum' ? {} : totals
  const problems = copyProblems(at, 'label', given.label)
  if (given.values) {
    if (!given.label)
      problems.push(
        error(
          `${at}.label`,
          'Give a label with values, so readers know what the figures cover'
        )
      )
    const keys = new Set(card.columns.map((column) => column.key))
    for (const key of Object.keys(given.values))
      if (!keys.has(key))
        problems.push(
          error(`${at}.values.${key}`, `No column has the key "${key}"`)
        )
  } else if (!card.columns.some(isSummable))
    problems.push(
      warning(
        at,
        'No number column to sum, so the row shows only its label. Pass values'
      )
    )
  const label = labelColumnOf(
    card.columns.filter((column) => !card.groupBy?.includes(column.key))
  )
  if (given.values && label && Object.hasOwn(given.values, label.key))
    problems.push(
      warning(
        at,
        `The label goes in the "${label.key}" column, so its value never shows. Leave it out of values`
      )
    )
  else if (!given.values && label && isSummable(label))
    problems.push(
      warning(
        at,
        'Every column has a sum, so the label covers the first. Add a text column'
      )
    )
  return problems
}

const labelColumnOf = (columns: readonly TableColumn[]) =>
  columns[tableLabelIndex(columns)]

const isGroupable = (column: TableColumn) =>
  column.kind === 'text' || column.kind === 'status'

function groupProblems(
  card: Extract<DashboardCard, { kind: 'table' }>,
  path: string
) {
  const { groupBy, defaultExpanded } = card
  if (!groupBy)
    return defaultExpanded === undefined
      ? []
      : [
          warning(
            `${path}.defaultExpanded`,
            'Set groupBy too, or leave out defaultExpanded'
          )
        ]
  const problems: DashboardProblem[] = []
  groupBy.forEach((key, i) => {
    const column = card.columns.find((candidate) => candidate.key === key)
    if (groupBy.indexOf(key) < i)
      problems.push(error(`${path}.groupBy[${i}]`, `Group by "${key}" once`))
    else if (!column)
      problems.push(
        error(`${path}.groupBy[${i}]`, `No column has the key "${key}"`)
      )
    else if (!isGroupable(column))
      problems.push(
        error(
          `${path}.groupBy[${i}]`,
          `Group by a text or status column, not a ${column.kind} column`
        )
      )
  })
  const shown = card.columns.filter((column) => !groupBy.includes(column.key))
  if (!shown.length)
    problems.push(
      error(
        `${path}.groupBy`,
        'Leave at least one column ungrouped to show the rows'
      )
    )
  else if (!isGroupable(labelColumnOf(shown)!))
    problems.push(
      warning(
        `${path}.groupBy`,
        'With no text column, the group labels go in the first column without a sum. Add a text column, or make that one a status column'
      )
    )
  if (Array.isArray(defaultExpanded))
    defaultExpanded.forEach((groupPath, i) => {
      if (groupPath.length > groupBy.length)
        problems.push(
          warning(
            `${path}.defaultExpanded[${i}]`,
            'This path is deeper than groupBy, so it opens nothing'
          )
        )
    })
  return problems
}

function selectsPeriodProblems(
  plot: ChartPlot,
  path: string,
  period: DashboardPeriodSpec | undefined
) {
  if (!('selectsPeriod' in plot) || !plot.selectsPeriod) return []
  const at = `${path}.plot.selectsPeriod`
  if (!period)
    return [warning(at, 'The dashboard has no period for a drag to set')]
  const xs = plot.data.map((row) => row[plot.x]).filter((v) => v != null)
  return !xs.every(isWallTime)
    ? [warning(at, `"${plot.x}" isn't dated, so a drag can't set the period`)]
    : []
}

const BUILT_IN_COMPARISONS = ['previous-period', 'previous-year'] as const
const OPEN_ENDED: readonly DateRangeValue[] = ['upcoming', 'past', 'ongoing']
const DATE_TIME_START = /^\d{4}-\d{2}-\d{2}T/

function absoluteProblems(path: string, value: DateRangeValue | Comparison) {
  if (!isAbsoluteRange(value)) return []
  const { start, end } = value
  const ends = [start, end]
  if (ends.some((date) => DATE_TIME_START.test(date)))
    return [
      error(
        path,
        'Use plain dates, such as 2026-10-01. A dashboard period covers whole days'
      )
    ]
  if (!ends.every(isPlainDate))
    return [error(path, 'Use ISO dates, such as 2026-10-01')]
  if (compareDates(start, end) > 0)
    return [error(path, `Starts after it ends: ${start} to ${end}`)]
  return []
}

function periodProblems(period: DashboardPeriodSpec | undefined) {
  if (!period) return []
  const { range, compare, history } = period
  const problems = absoluteProblems('period.range', range)
  if (isRollingRange(range) && range.unit === 'hour')
    problems.push(
      error(
        'period.range',
        'Use days, weeks or months. A dashboard period covers whole days'
      )
    )
  if (!compare) {
    if (history)
      problems.push(
        warning('period.history', 'History applies only with a compare')
      )
  } else if (!isBuiltInComparison(compare)) {
    const lookalike = BUILT_IN_COMPARISONS.find(
      (name) =>
        name ===
        compare
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z]+/g, '-')
          .replace(/^-|-$/g, '')
    )
    if (lookalike)
      problems.push(
        warning(
          'period.compare',
          `"${compare}" is an app's own comparison, with no dates. Did you mean "${lookalike}"?`
        )
      )
    if (history)
      problems.push(
        warning(
          'period.history',
          `History applies only to Roadie's comparisons, not "${compare}"`
        )
      )
  } else {
    problems.push(...absoluteProblems('period.compare', compare))
    if (OPEN_ENDED.includes(range))
      problems.push(
        warning(
          'period.compare',
          `"${String(range)}" has no fixed length, so nothing compares with it`
        )
      )
  }
  return problems
}

function deltaProblems(
  card: DashboardCard,
  path: string,
  period: DashboardPeriodSpec | undefined
) {
  if (card.kind === 'note' || !card.delta?.comparison) return []
  if (!period)
    return [
      error(
        `${path}.delta.comparison`,
        'Add a period to the dashboard, so this delta has something to compare with'
      )
    ]
  if (period.compare && !isBuiltInComparison(period.compare))
    return [
      warning(
        `${path}.delta.comparison`,
        `"${period.compare}" is the app's own comparison, so this delta hides. Leave out comparison and give the card its own context`
      )
    ]
  return card.context && period.compare
    ? [
        warning(
          `${path}.context`,
          'The context line names the comparison, so this context never shows. Leave it out'
        )
      ]
    : []
}

function cardProblems(
  card: DashboardCard,
  path: string,
  period: DashboardPeriodSpec | undefined
) {
  const problems: DashboardProblem[] = deltaProblems(card, path, period)
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

  if (card.kind === 'chart' || card.kind === 'table')
    problems.push(...valueOrTakeawayProblems(card, path))

  if (card.kind === 'table')
    problems.push(...columnProblems(card, `${path}.columns`))
  if (card.kind === 'chart' && card.table)
    problems.push(...columnProblems(card.table, `${path}.table.columns`))

  problems.push(
    ...headlineCopyProblems(
      card.kind === 'chart' || card.kind === 'table'
        ? card
        : { label: card.label, context: card.context },
      path
    )
  )
  if (card.kind === 'note')
    problems.push(...copyProblems(path, 'body', card.body))
  if (card.kind === 'chart' && card.plot.kind !== 'static')
    problems.push(
      ...plotProblems(card.plot, `${path}.plot`),
      ...selectsPeriodProblems(card.plot, path, period)
    )
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
  if (card.kind === 'table')
    problems.push(...totalsProblems(card, path), ...groupProblems(card, path))
  return problems
}

export function validateDashboard(input: unknown): DashboardValidation {
  const parsed = dashboardSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, problems: schemaProblems(parsed.error.issues) }

  const dashboard = parsed.data
  const problems: DashboardProblem[] = periodProblems(dashboard.period)
  const seen = new Set<string>()

  dashboard.sections.forEach((section, s) => {
    const sectionPath = `sections[${s}]`
    problems.push(...copyProblems(sectionPath, 'title', section.title))
    section.cards.forEach((card, c) => {
      const path = `${sectionPath}.cards[${c}]`
      if (seen.has(card.id))
        problems.push(error(`${path}.id`, `Duplicate id "${card.id}"`))
      seen.add(card.id)
      problems.push(...cardProblems(card, path, dashboard.period))
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
