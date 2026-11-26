import { labelColumnIndex } from '@oztix/roadie-core/dashboard-layout'
import { formatRecordValue } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { type RecordsResolvedTotals, isSummedField } from '../Records/totals'
import {
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass
} from './RecordTableRow'
import {
  type ColumnLayout,
  NARROW_HIDDEN_CLASS,
  NARROW_TOTALS_LABEL_CLASS,
  NARROW_TOTALS_ROW_CLASS,
  NARROW_TOTAL_HEADING_CLASS,
  NARROW_TOTAL_VALUE_CLASS,
  priorityProps,
  titleColumn,
  totalsCellClass
} from './layout'
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

/**
 * The totals under a wide table's headings: one cell per column, the label as
 * the row's header. Under 40rem, when the rows re-flow, the same cells wrap
 * onto one line, the label first, each total beside its column's heading.
 */
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
  // A thumbnail is too narrow for the label.
  const labelIndex = labelColumnIndex(
    columns,
    titleColumn(columns),
    (column) =>
      column.kind === 'image' ||
      (column.total !== false && isSummedField(column.field))
  )
  return (
    <div
      role='row'
      aria-rowindex={rowIndex}
      data-slot='record-table-totals'
      className={cn(
        rowClass,
        'h-7 border-b border-normal',
        totalsTextClass,
        layout.narrow && NARROW_TOTALS_ROW_CLASS
      )}
    >
      {select && (
        <div
          role='cell'
          data-select=''
          className={cn(selectCellClass, layout.narrow && NARROW_HIDDEN_CLASS)}
        />
      )}
      {columns.map((column, index) => {
        const label = index === labelIndex
        const value = label ? undefined : totalOf({ totals, timeZone }, column)
        const shared = {
          'data-pin': column.pin || undefined,
          ...priorityProps(layout, index),
          className: cn(
            cellClass(column),
            totalsCellClass(layout, index, label || value !== undefined),
            'items-start',
            label && NARROW_TOTALS_LABEL_CLASS
          ),
          style: pinStyle(layout.pinnedStart[index])
        }
        if (label)
          return (
            <div key={column.key} role='rowheader' {...shared}>
              <span className='truncate'>{totals.label}</span>
            </div>
          )
        return (
          <div key={column.key} role='cell' {...shared}>
            {value !== undefined && layout.narrow && (
              // The column header names the cell; this shows it where the header row hides.
              <span aria-hidden className={NARROW_TOTAL_HEADING_CLASS}>
                {column.field.label}
              </span>
            )}
            {layout.narrow ? (
              <span className={NARROW_TOTAL_VALUE_CLASS}>{value}</span>
            ) : (
              value
            )}
          </div>
        )
      })}
      {actions && (
        <div
          role='cell'
          className={cn(actionsCellClass, layout.narrow && NARROW_HIDDEN_CLASS)}
        />
      )}
    </div>
  )
}

/** The totals above deprecated cards, which have no columns: the label, then each heading and its total. */
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
