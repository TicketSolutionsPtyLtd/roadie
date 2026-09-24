import type { ReactNode } from 'react'

import { ChartLineIcon, TableIcon } from '@phosphor-icons/react/ssr'

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

export type ChartTable = {
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
}
export type ChartView = 'chart' | 'table'

export type ChartProps = Omit<DataCardProps, 'children' | 'source'> & {
  source: string
  /** Exact numbers behind the chart, shown in the Table view. */
  table: ChartTable
  /** @default 'chart' */
  view?: ChartView
  legend?: ReactNode
  children: ReactNode
}

const TAB = 'h-6 px-2'

export function Chart({
  table,
  view = 'chart',
  legend,
  children,
  size,
  className,
  label,
  ...props
}: ChartProps) {
  return (
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
                columns={table.columns}
                rows={table.rows}
                caption={label}
                plain
                className='max-w-2xl'
              />
            </Tabs.Panel>
          </div>
        </div>
      </DataCard>
    </Tabs.Root>
  )
}
Chart.displayName = 'Chart'
