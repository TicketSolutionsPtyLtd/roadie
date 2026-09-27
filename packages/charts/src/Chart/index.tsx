'use client'

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
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
import { Skeleton } from '@oztix/roadie-components/skeleton'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'
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
   * the card supplies its own once it runs in the browser, and this wins over
   * it. When the Table view renders on the server, or must work without
   * JavaScript, pass `table` from `@oztix/roadie-charts/tables`.
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

function ViewSwitch({
  label,
  view,
  viewsId,
  onViewChange
}: {
  label: string
  view: ChartView
  viewsId: string
  onViewChange: (view: ChartView) => void
}) {
  return (
    <ToggleGroup<ChartView>
      aria-label={`${label} view`}
      size='md'
      emphasis='subtler'
      value={[view]}
      onValueChange={([next]) => next && onViewChange(next)}
    >
      <ToggleGroup.Item
        value='chart'
        aria-label='Chart'
        title='Chart'
        aria-controls={viewsId}
      >
        <ChartLineIcon weight='bold' className='size-4' />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value='table'
        aria-label='Table'
        title='Table'
        aria-controls={viewsId}
      >
        <TableIcon weight='bold' className='size-4' />
      </ToggleGroup.Item>
    </ToggleGroup>
  )
}

function ViewPane({
  view,
  shown,
  children
}: {
  view: ChartView
  shown: ChartView
  children: ReactNode
}) {
  const hidden = view !== shown
  // Both views stay laid out in one grid cell so the card keeps its height.
  return (
    <div
      data-chart-view={view}
      data-hidden={hidden ? '' : undefined}
      inert={hidden}
    >
      {children}
    </div>
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
  // A real chart reports its table in its own mount effect, which fires
  // before this one, so it never sees this flag turn true without a report.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  // The failure belongs to the plot that caused it, so new children retry.
  const [failedOn, setFailedOn] = useState<ReactNode>(null)
  const failed = failedOn !== null && failedOn === children
  const fail = useCallback(() => setFailedOn(children), [children])
  const { patterns, style: patternStyle } = useChartPatterns()
  const [shownView, setShownView] = useState(view)
  const summaryId = useId()
  const viewsId = useId()
  const plotHeight = PLOT_HEIGHTS[size ?? 'md']
  const hasLegend = Boolean(legend)
  const context = useMemo(
    () => ({ plotHeight, report: setReport, fail, hasLegend }),
    [plotHeight, fail, hasLegend]
  )
  const shownTable = table ?? report?.table
  const showViews = !failed && hasData(state)
  return (
    <ChartCardContext.Provider value={context}>
      <div
        data-size={size}
        data-slot='chart'
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
                {showViews && (
                  <ViewSwitch
                    label={label}
                    view={shownView}
                    viewsId={viewsId}
                    onViewChange={setShownView}
                  />
                )}
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
            <div id={viewsId} data-slot='chart-views'>
              <ViewPane view='chart' shown={shownView}>
                <div data-slot='chart-plot' className='w-full'>
                  <PlotBoundary onError={fail}>{children}</PlotBoundary>
                </div>
              </ViewPane>
              <ViewPane view='table' shown={shownView}>
                {shownTable ? (
                  <DataTable
                    columns={shownTable.columns}
                    rows={shownTable.rows}
                    caption={label}
                    plain
                  />
                ) : mounted ? (
                  // A custom child with no table prop and no report of its
                  // own never fills this in, so stop waiting after mount.
                  <p className='text-sm text-subtle'>No table for this chart</p>
                ) : (
                  // The chart reports its table from an effect, so a server
                  // render has none until it hydrates.
                  <Skeleton
                    shape='block'
                    style={{ height: bodyHeight ?? 'var(--chart-plot-height)' }}
                  />
                )}
              </ViewPane>
            </div>
          </div>
        </DataCard>
      </div>
      {patterns}
    </ChartCardContext.Provider>
  )
}
Chart.displayName = 'Chart'
