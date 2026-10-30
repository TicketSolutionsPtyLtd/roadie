import type {
  BarPlot,
  DashboardCard,
  DashboardPeriodSpec,
  LinePlot
} from '@oztix/roadie-core/dashboard'
import {
  type Comparison,
  type DescribeComparisonOptions,
  describeComparison,
  isBuiltInComparison
} from '@oztix/roadie-core/datetime'

export type FollowPeriodOptions = Pick<
  DescribeComparisonOptions,
  'timeZone' | 'locale'
>

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

function warnOnce(message: string) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  if (warned.has(message)) return
  warned.add(message)
  console.error(message)
}

// validateDashboard rejects these; an unchecked spec still renders, and says why.
export function comparisonLine(
  compare: Comparison,
  where: FollowPeriodOptions
): string {
  try {
    return describeComparison(compare, where)
  } catch (error) {
    warnOnce(
      `DashboardView: couldn't describe the comparison, so it reads "vs custom dates": ${error instanceof Error ? error.message : String(error)}`
    )
    return 'vs custom dates'
  }
}

// ANNOTATION_LABEL_LIMIT, which can't be imported without the spec's schemas.
const SERIES_LABEL_LIMIT = 20

/** "vs previous period" names a series as "Previous period". */
function seriesName(line: string) {
  const name = line
    .replace(/^vs /, '')
    .replace(/^\p{Ll}/u, (first) => first.toUpperCase())
  return name.length > SERIES_LABEL_LIMIT ? 'Custom dates' : name
}

type Compared = Omit<LinePlot, 'data'> | Omit<BarPlot, 'data'>

function followComparison<P extends Compared>(
  plot: P,
  period: DashboardPeriodSpec | undefined,
  where: FollowPeriodOptions
): P {
  if (!plot.comparison) return plot
  const compare = period?.compare
  if (
    !compare ||
    !isBuiltInComparison(compare) ||
    period.history === 'unavailable'
  )
    return { ...plot, comparison: undefined }
  const label = seriesName(comparisonLine(compare, where))
  return { ...plot, comparison: { ...plot.comparison, label } }
}

/**
 * The card as DashboardView draws it for the period, for a server that builds
 * its CSV with `cardTable` or its image with `renderChartSvg`. A line or bar
 * plot's comparison, small multiples' panels too, is drawn only with Roadie's
 * previous period, previous year, or custom dates, and `history` other than
 * `unavailable`, and is named by it: "Previous period", the dates, or "Custom
 * dates" when they're too long for a series label. Pass the `timeZone` and
 * `locale` the dashboard's period uses.
 */
export function followPeriod(
  card: DashboardCard,
  period: DashboardPeriodSpec | undefined,
  options: FollowPeriodOptions = {}
): DashboardCard {
  if (card.kind !== 'chart') return card
  const { plot } = card
  if (plot.kind === 'line' || plot.kind === 'bar')
    return { ...card, plot: followComparison(plot, period, options) }
  if (plot.kind === 'small-multiples')
    return {
      ...card,
      plot: { ...plot, chart: followComparison(plot.chart, period, options) }
    }
  return card
}
