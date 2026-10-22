import { formatRecordValue } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import type { RecordsResolvedTotals } from '../Records/totals'
import {
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass,
  titleColumn
} from './RecordTableRow'
import { type ColumnLayout, priorityProps } from './layout'
import type { RecordTableColumn } from './types'

const totalsTextClass = 'text-xs text-subtle tabular-nums'

type TotalsProps = {
  totals: RecordsResolvedTotals
  columns: readonly RecordTableColumn[]
  timeZone: string
}

function totalOf(
  { totals, timeZone }: Omit<TotalsProps, 'columns'>,
  column: RecordTableColumn
) {
  if (column.total === false) return undefined
  const value = totals.values[column.key]
  if (value === undefined || value === null) return undefined
  return (
    formatRecordValue(totals.values, column.field, { timeZone }) ?? undefined
  )
}

/** The totals under a wide table's headings: one cell per column, the label as the row's header. */
export function RecordTableTotalsRow({
  totals,
  columns,
  timeZone,
  layout,
  select,
  actions,
  rowIndex
}: TotalsProps & {
  layout: ColumnLayout
  select: boolean
  actions: boolean
  rowIndex?: number
}) {
  // The title column has no total and never hides; a thumbnail is too narrow.
  const title = titleColumn(columns)
  const labelIndex = title
    ? columns.indexOf(title)
    : Math.max(
        0,
        columns.findIndex((column) => column.kind !== 'image')
      )
  return (
    <div
      role='row'
      aria-rowindex={rowIndex}
      data-slot='record-table-totals'
      className={cn(rowClass, 'h-7 border-b border-normal', totalsTextClass)}
    >
      {select && <div role='cell' data-select='' className={selectCellClass} />}
      {columns.map((column, index) => {
        const shared = {
          'data-pin': column.pin || undefined,
          ...priorityProps(column, layout, index),
          className: cn(cellClass(column), 'items-start'),
          style: pinStyle(layout.pinnedStart[index])
        }
        if (index === labelIndex)
          return (
            <div key={column.key} role='rowheader' {...shared}>
              <span className='truncate'>{totals.label}</span>
            </div>
          )
        return (
          <div key={column.key} role='cell' {...shared}>
            {totalOf({ totals, timeZone }, column)}
          </div>
        )
      })}
      {actions && <div role='cell' className={actionsCellClass} />}
    </div>
  )
}

/** The totals above narrow rows, which have no columns: the label, then each heading and its total. */
export function RecordTableNarrowTotals({
  totals,
  columns,
  timeZone
}: TotalsProps) {
  const items = columns.flatMap((column) => {
    const value = totalOf({ totals, timeZone }, column)
    return value === undefined ? [] : [{ key: column.key, value, column }]
  })
  return (
    <p
      data-slot='record-table-totals'
      className={cn('flex flex-wrap gap-x-3 gap-y-0.5 py-2', totalsTextClass)}
    >
      <span className='font-semibold'>{totals.label}</span>
      {items.map(({ key, value, column }) => (
        <span key={key}>
          {column.field.label} <span className='text-normal'>{value}</span>
        </span>
      ))}
    </p>
  )
}
