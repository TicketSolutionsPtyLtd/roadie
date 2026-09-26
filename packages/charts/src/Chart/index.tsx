'use client'

import {
  Component,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useState
} from 'react'

import { ChartLineIcon, TableIcon } from '@phosphor-icons/react'

import {
  DataCard,
  type DataCardProps
} from '@oztix/roadie-components/data-card'
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow
} from '@oztix/roadie-components/data-table'
import { Tabs } from '@oztix/roadie-components/tabs'
import { cn } from '@oztix/roadie-core/utils'

import { useChartPatterns } from '../ChartPatterns'
import { ChartCardContext, type ChartReport, PLOT_HEIGHTS } from './context'

export type ChartTable = {
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
}
export type ChartView = 'chart' | 'table'

export type ChartProps = Omit<
  DataCardProps,
  'children' | 'source' | 'bodyHeight'
> & {
  source: string
  /**
   * Body height while loading. Defaults to the live plot height for `size`:
   * 160px at `sm`, 220px at `md`, and from 260px up to 340px at `lg` or 420px
   * at `full` as the card widens. A static plot sizes to its image, so it may
   * settle at a different height when it loads.
   */
  bodyHeight?: string
  /**
   * Exact numbers behind the chart, shown in the Table view. A chart inside
   * the card supplies its own, and this wins over it.
   */
  table?: ChartTable
  /** @default 'chart' */
  view?: ChartView
  legend?: ReactNode
  /**
   * Card actions after the Chart and Table switch, such as
   * `<DataCard.MoreButton>`. Shown in every state.
   */
  actions?: ReactNode
  children: ReactNode
}

type PlotBoundaryProps = { onError: () => void; children: ReactNode }
type PlotBoundaryState = { failed: boolean; children?: ReactNode }

// A chart that throws while drawing puts its own card in the error state
// instead of taking down the page around it, and tries again on a new plot.
class PlotBoundary extends Component<PlotBoundaryProps, PlotBoundaryState> {
  state: PlotBoundaryState = { failed: false }

  static getDerivedStateFromProps(
    props: PlotBoundaryProps,
    state: PlotBoundaryState
  ) {
    return props.children === state.children
      ? null
      : { failed: false, children: props.children }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

const EMPTY_TABLE: ChartTable = { columns: [], rows: [] }

function ViewSwitch({ label }: { label: string }) {
  return (
    <Tabs.List aria-label={`${label} view`}>
      <Tabs.Tab value='chart' aria-label='Chart' title='Chart'>
        <ChartLineIcon weight='bold' className='size-4' />
      </Tabs.Tab>
      <Tabs.Tab value='table' aria-label='Table' title='Table'>
        <TableIcon weight='bold' className='size-4' />
      </Tabs.Tab>
      <Tabs.Indicator />
    </Tabs.List>
  )
}

const hasData = (state: ChartProps['state']) =>
  state === undefined || state === 'ready' || state === 'stale'

export function Chart({
  table,
  view = 'chart',
  legend,
  actions,
  children,
  size,
  className,
  label,
  bodyHeight,
  state,
  ...props
}: ChartProps) {
  const [report, setReport] = useState<ChartReport | null>(null)
  // The failure belongs to the plot that caused it, so new children retry.
  const [failedOn, setFailedOn] = useState<ReactNode>(null)
  const failed = failedOn !== null && failedOn === children
  const fail = useCallback(() => setFailedOn(children), [children])
  const { patterns, style: patternStyle } = useChartPatterns()
  const summaryId = useId()
  const plotHeight = PLOT_HEIGHTS[size ?? 'md']
  const hasLegend = Boolean(legend)
  const context = useMemo(
    () => ({ plotHeight, report: setReport, fail, hasLegend }),
    [plotHeight, fail, hasLegend]
  )
  const shownTable = table ?? report?.table ?? EMPTY_TABLE
  const showViews = !failed && hasData(state)
  return (
    <ChartCardContext.Provider value={context}>
      <Tabs.Root
        defaultValue={view}
        data-size={size}
        data-slot='chart'
        emphasis='subtle'
        size='xs'
        className={cn('h-full', className)}
        style={patternStyle}
      >
        <DataCard
          label={label}
          size={size}
          bodyHeight={bodyHeight ?? 'var(--chart-plot-height)'}
          state={failed ? 'error' : state}
          aria-describedby={report ? summaryId : undefined}
          actions={
            showViews || actions ? (
              <>
                {showViews && <ViewSwitch label={label} />}
                {actions}
              </>
            ) : undefined
          }
          {...props}
        >
          <div className='grid gap-3'>
            {report && (
              <p id={summaryId} className='sr-only'>
                {report.summary}
              </p>
            )}
            {legend}
            <div data-slot='chart-views'>
              <Tabs.Panel
                value='chart'
                keepMounted
                hidden={false}
                data-chart-view='chart'
              >
                <div data-slot='chart-plot' className='w-full'>
                  <PlotBoundary onError={fail}>{children}</PlotBoundary>
                </div>
              </Tabs.Panel>
              <Tabs.Panel
                value='table'
                keepMounted
                hidden={false}
                data-chart-view='table'
              >
                <DataTable
                  columns={shownTable.columns}
                  rows={shownTable.rows}
                  caption={label}
                  plain
                />
              </Tabs.Panel>
            </div>
          </div>
        </DataCard>
      </Tabs.Root>
      {patterns}
    </ChartCardContext.Provider>
  )
}
Chart.displayName = 'Chart'
