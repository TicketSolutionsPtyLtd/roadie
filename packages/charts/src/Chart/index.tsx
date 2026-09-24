import type { ReactNode } from 'react'

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
            <Tabs.Tab value='chart'>Chart</Tabs.Tab>
            <Tabs.Tab value='table'>Table</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        }
        {...props}
      >
        <div className='grid gap-3'>
          {legend}
          <Tabs.Panel value='chart' keepMounted>
            <div data-slot='chart-plot' className='w-full'>
              {children}
            </div>
          </Tabs.Panel>
          <Tabs.Panel value='table' keepMounted>
            <DataTable
              columns={table.columns}
              rows={table.rows}
              caption={label}
              plain
            />
          </Tabs.Panel>
        </div>
      </DataCard>
    </Tabs.Root>
  )
}
Chart.displayName = 'Chart'
