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
  type AbsoluteRange,
  isBuiltInComparison
} from '@oztix/roadie-core/datetime'

import { Chart } from '../Chart'
import { ChartLegend } from '../ChartLegend'
import { cardTable } from '../tables/cardTable'
import {
  type FollowPeriodOptions,
  comparisonLine,
  followPeriod
} from '../tables/followPeriod'
import { PlotView } from './plots'

export type DashboardViewProps = {
  spec: DashboardSpec
  /**
   * Actions for each card, such as a More button, placed at its top right.
   * They carry handlers, so they come from the app rather than the spec.
   * Return nothing to leave a card without actions. Each gets its card as
   * drawn, with a chart's comparison following the period, so a CSV from
   * `cardTable(card)` matches the Table view. When this renders on the
   * server, return a client component that owns the handlers, not inline
   * handlers.
   */
  cardActions?: (card: DashboardCard) => ReactNode
  /**
   * Links a table card's row to its own page, such as a show to its event
   * view. Like actions, links come from the app rather than the spec. It gets
   * the dashboard's period, so a link can open the same dates.
   */
  getRowHref?: (
    card: TableCard,
    row: TableRow,
    period: DashboardPeriodSpec | undefined
  ) => string | undefined
  /**
   * Called with the period and comparison chosen in the toolbar, without
   * `history`: resolve them, fetch, and pass back a spec with the new
   * `period`. Without it the period shows read-only, as when the page sets it.
   * It also takes the range dragged across a card whose plot sets
   * `selectsPeriod`, with the current comparison.
   */
  onPeriodChange?: (period: DashboardPeriodValue<string>) => void
  /**
   * The period toolbar's other props: `presets`, `timeZone`, `today`,
   * `locale`, `weekStart`, `fiscalYearStart`, `dataStart`, `dataEnd`,
   * `alignWeekday`, `compareOptions`, `disabled` while refetching, and
   * `children` for the app's own controls.
   */
  periodProps?: DashboardViewPeriodProps
  className?: string
}

export type DashboardViewPeriodProps = Omit<
  DashboardPeriodProps<string>,
  'value' | 'defaultValue' | 'onValueChange' | 'readOnly'
>

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

const HISTORY_MESSAGE = {
  partial: 'Not enough history',
  unavailable: 'Nothing to compare'
} as const

/**
 * A delta marked `comparison` follows the dashboard's: hidden with no
 * comparison of Roadie's, replaced by a message when the data can't cover
 * it, and otherwise named on the context line, over any context the card
 * gives.
 */
function headline(
  card: Exclude<DashboardCard, { kind: 'note' }>,
  period: DashboardPeriodSpec | undefined,
  where: FollowPeriodOptions
) {
  if (!card.delta) return { delta: undefined, context: card.context }
  const { comparison, ...delta } = card.delta
  if (!comparison) return { delta, context: card.context }
  if (!period?.compare || !isBuiltInComparison(period.compare))
    return { delta: undefined, context: card.context }
  if (period.history)
    return { delta: undefined, context: HISTORY_MESSAGE[period.history] }
  return {
    delta,
    context: comparisonLine(period.compare, where)
  }
}

const selectsPeriod = (card: DashboardCard) =>
  card.kind === 'chart' &&
  'selectsPeriod' in card.plot &&
  card.plot.selectsPeriod === true

function warnUnwired(spec: DashboardSpec) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  for (const section of spec.sections)
    for (const card of section.cards) {
      if (!selectsPeriod(card) || warned.has(card.id)) continue
      warned.add(card.id)
      console.warn(
        `DashboardView: card "${card.id}" sets selectsPeriod, but there's no onPeriodChange, so a drag can't set the period`
      )
    }
}

// A dashboard period covers whole days, so an hourly card's range widens.
const wholeDays = ({ start, end }: AbsoluteRange): AbsoluteRange => ({
  start: start.slice(0, 10),
  end: end.slice(0, 10)
})

const isRange = (value: DashboardPeriodSpec['range'], range: AbsoluteRange) =>
  typeof value === 'object' &&
  'start' in value &&
  value.start === range.start &&
  value.end === range.end

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
  onRangeSelect?: (range: AbsoluteRange) => void
  period?: DashboardPeriodSpec
  timeZone?: string
  locale?: string
}

function Card({
  card,
  size,
  actions,
  getRowHref,
  onRangeSelect,
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
          decimals={card.decimals}
          trailingZeroDisplay={card.trailingZeroDisplay}
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
          decimals={card.decimals}
          trailingZeroDisplay={card.trailingZeroDisplay}
          delta={delta}
          takeaway={card.takeaway}
        >
          <DataTable
            totals={card.totals}
            groupBy={card.groupBy}
            defaultExpanded={card.defaultExpanded}
            columns={card.columns}
            rows={card.rows}
            caption={card.label}
            getRowHref={getRowHref && ((row) => getRowHref(card, row, period))}
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
          decimals={card.decimals}
          trailingZeroDisplay={card.trailingZeroDisplay}
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
            onRangeSelect={onRangeSelect}
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
  if (!onPeriodChange) warnUnwired(spec)
  const selectPeriod =
    period && onPeriodChange && !periodProps?.disabled
      ? (selected: AbsoluteRange) => {
          const range = wholeDays(selected)
          if (isRange(period.range, range)) return
          onPeriodChange(
            period.compare ? { range, compare: period.compare } : { range }
          )
        }
      : undefined
  const rangeSelectFor = (card: DashboardCard) =>
    selectsPeriod(card) ? selectPeriod : undefined
  const where = {
    timeZone: periodProps?.timeZone,
    locale: periodProps?.locale
  }
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
          {section.cards.map((card) => {
            const shown = followPeriod(card, period, where)
            return (
              <Card
                key={card.id}
                card={shown}
                size={card.size}
                actions={cardActions?.(shown)}
                getRowHref={getRowHref}
                onRangeSelect={rangeSelectFor(card)}
                period={period}
                timeZone={periodProps?.timeZone}
                locale={periodProps?.locale}
              />
            )
          })}
        </Dashboard.Section>
      ))}
    </Dashboard>
  )
}
DashboardView.displayName = 'DashboardView'
