'use client'

import { type ReactNode, useId, useMemo, useState } from 'react'

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

import { ChartPatterns } from '../ChartPatterns'
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
   * Body height while loading. Defaults to the live plot height for `size`
   * (160px, 220px or 260px). A static plot sizes to its image, so it may
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
  children: ReactNode
}

const TAB = 'h-6 px-2'

const EMPTY_TABLE: ChartTable = { columns: [], rows: [] }

export function Chart({
  table,
  view = 'chart',
  legend,
  children,
  size,
  className,
  label,
  bodyHeight,
  ...props
}: ChartProps) {
  const [report, setReport] = useState<ChartReport | null>(null)
  const summaryId = useId()
  const plotHeight = PLOT_HEIGHTS[size ?? 'md']
  const context = useMemo(
    () => ({ plotHeight, report: setReport }),
    [plotHeight]
  )
  const shownTable = table ?? report?.table ?? EMPTY_TABLE
  return (
    <ChartCardContext.Provider value={context}>
      <Tabs.Root
        defaultValue={view}
        data-size={size}
        data-slot='chart'
        emphasis='subtle'
        size='sm'
        className={cn('h-full', className)}
      >
        <DataCard
          label={label}
          size={size}
          bodyHeight={bodyHeight ?? `${plotHeight}px`}
          aria-describedby={report ? summaryId : undefined}
          actions={
            <Tabs.List aria-label={`${label} view`}>
              <Tabs.Tab
                value='chart'
                aria-label='Chart'
                title='Chart'
                className={TAB}
              >
                <ChartLineIcon weight='bold' className='size-4' />
              </Tabs.Tab>
              <Tabs.Tab
                value='table'
                aria-label='Table'
                title='Table'
                className={TAB}
              >
                <TableIcon weight='bold' className='size-4' />
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
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
                  {children}
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
                  className='max-w-2xl'
                />
              </Tabs.Panel>
            </div>
          </div>
        </DataCard>
      </Tabs.Root>
      <ChartPatterns />
    </ChartCardContext.Provider>
  )
}
Chart.displayName = 'Chart'
