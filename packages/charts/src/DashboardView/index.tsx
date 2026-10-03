import type { ReactNode } from 'react'

import { Dashboard } from '@oztix/roadie-components/dashboard'
import {
  DashboardPeriod,
  type DashboardPeriodProps,
  type DashboardPeriodValue
} from '@oztix/roadie-components/dashboard-period'
import { DataCard } from '@oztix/roadie-components/data-card'
import { DataTable } from '@oztix/roadie-components/data-table'
import { StatTile } from '@oztix/roadie-components/stat-tile'
import type {
  CardSize,
  DashboardCard,
  DashboardPeriodSpec,
  DashboardSpec,
  TableCard,
  TableRow
} from '@oztix/roadie-core/dashboard'
import {
  type Comparison,
  type DescribeComparisonOptions,
  describeComparison
} from '@oztix/roadie-core/datetime'

import { Chart } from '../Chart'
import { ChartLegend } from '../ChartLegend'
import { cardTable } from '../tables/cardTable'
import { PlotView } from './plots'

export type DashboardViewProps = {
  spec: DashboardSpec
  /**
   * Actions for each card, such as a More button, placed at its top right.
   * They carry handlers, so they come from the app rather than the spec.
   * Return nothing to leave a card without actions. When this renders on the
   * server, return a client component that owns the handlers, not inline
   * handlers.
   */
  cardActions?: (card: DashboardCard) => ReactNode
  /**
   * Links a table card's row to its own page, such as a show to its event
   * view. Like actions, links come from the app rather than the spec.
   */
  getRowHref?: (card: TableCard, row: TableRow) => string | undefined
  /**
   * Called with the period and comparison chosen in the toolbar, without
   * `history`: resolve them, fetch, and pass back a spec with the new
   * `period`. Without it the period shows read-only, as when the page sets it.
   */
  onPeriodChange?: (period: DashboardPeriodValue) => void
  /**
   * How the period toolbar reads and what sits beside it: `presets`,
   * `timeZone`, `fiscalYearStart`, `disabled` while refetching, and
   * `children` for the app's own controls, such as a benchmark.
   */
  periodProps?: DashboardViewPeriodProps
  className?: string
}

export type DashboardViewPeriodProps = Omit<
  DashboardPeriodProps,
  'value' | 'defaultValue' | 'onValueChange' | 'readOnly'
>

const HISTORY_MESSAGE = {
  partial: 'Not enough history',
  unavailable: 'Nothing to compare'
} as const

function comparisonLine(
  compare: Comparison,
  where: DescribeComparisonOptions
): string {
  try {
    return describeComparison(compare, where)
  } catch {
    // validateDashboard rejects custom date-times; an unchecked spec still renders.
    return 'vs custom dates'
  }
}

/**
 * A delta marked `comparison` follows the dashboard's: hidden with no
 * comparison, replaced by a message when the data can't cover it, and
 * otherwise named on the context line.
 */
function headline(
  card: Exclude<DashboardCard, { kind: 'note' }>,
  period: DashboardPeriodSpec | undefined,
  where: Pick<DescribeComparisonOptions, 'timeZone' | 'locale'>
) {
  if (!card.delta) return { delta: undefined, context: card.context }
  const { comparison, ...delta } = card.delta
  if (!comparison) return { delta, context: card.context }
  if (!period?.compare) return { delta: undefined, context: card.context }
  if (period.history)
    return { delta: undefined, context: HISTORY_MESSAGE[period.history] }
  return {
    delta,
    context: card.context ?? comparisonLine(period.compare, where)
  }
}

const cardProps = (card: DashboardCard, actions: ReactNode) => ({
  actions,
  label: card.label,
  context: card.context,
  state: card.state,
  emptyMessage: card.emptyMessage,
  errorMessage: card.errorMessage,
  staleLabel: card.staleLabel,
  source: card.source
})

type CardProps = {
  card: DashboardCard
  size: CardSize
  actions: ReactNode
  getRowHref?: DashboardViewProps['getRowHref']
  period?: DashboardPeriodSpec
  timeZone?: string
  locale?: string
}

function Card({
  card,
  size,
  actions,
  getRowHref,
  period,
  timeZone,
  locale
}: CardProps) {
  if (card.kind === 'note')
    return (
      <DataCard {...cardProps(card, actions)} size={size}>
        <p className='text-sm text-normal'>{card.body}</p>
      </DataCard>
    )
  const { delta, context } = headline(card, period, { timeZone, locale })
  const common = { ...cardProps(card, actions), context }
  switch (card.kind) {
    case 'stat':
      return (
        <StatTile
          {...common}
          value={card.value}
          format={card.format}
          delta={delta}
          trend={card.trend}
          reference={card.reference}
        />
      )
    case 'table':
      return (
        <DataCard
          {...common}
          size={size}
          value={card.value}
          format={card.format}
          delta={delta}
          takeaway={card.takeaway}
        >
          <DataTable
            totals={card.totals}
            columns={card.columns}
            rows={card.rows}
            caption={card.label}
            getRowHref={getRowHref && ((row) => getRowHref(card, row))}
          />
        </DataCard>
      )
    case 'chart':
      return (
        <Chart
          {...common}
          source={card.source}
          size={size}
          value={card.value}
          format={card.format}
          delta={delta}
          takeaway={card.takeaway}
          view={card.view}
          table={cardTable(card)}
          legend={card.legend && <ChartLegend items={card.legend} />}
        >
          <PlotView
            plot={card.plot}
            takeaway={
              card.plot.kind === 'static'
                ? undefined
                : (card.plot.takeaway ?? card.takeaway)
            }
          />
        </Chart>
      )
  }
}

export function DashboardView({
  spec,
  cardActions,
  getRowHref,
  onPeriodChange,
  periodProps,
  className
}: DashboardViewProps) {
  const { period } = spec
  return (
    <Dashboard className={className}>
      {period && (
        <DashboardPeriod
          {...periodProps}
          value={{ range: period.range, compare: period.compare }}
          onValueChange={onPeriodChange}
          readOnly={!onPeriodChange}
        />
      )}
      {spec.sections.map((section, index) => (
        <Dashboard.Section
          key={`${index}-${section.title}`}
          title={section.title}
          description={section.description}
        >
          {section.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              size={card.size}
              actions={cardActions?.(card)}
              getRowHref={getRowHref}
              period={period}
              timeZone={periodProps?.timeZone}
              locale={periodProps?.locale}
            />
          ))}
        </Dashboard.Section>
      ))}
    </Dashboard>
  )
}
DashboardView.displayName = 'DashboardView'
