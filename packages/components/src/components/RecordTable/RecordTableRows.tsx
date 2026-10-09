'use client'

import { type ReactNode, type RefObject, useCallback } from 'react'

import {
  VIRTUALISE_AFTER,
  type WindowPadding,
  recordsWindow
} from '../Records/recordsWindow'
import { useRangeWindow, useRowWindow } from '../Records/rowWindow'
import type { RecordsRangeState, RecordsRow } from '../Records/types'
import { RecordTableRangeError } from './RecordTableRangeError'
import { RecordTableRow } from './RecordTableRow'
import { RecordTableSkeletonRow } from './RecordTableStates'
import type { ColumnLayout } from './layout'
import type { RecordTableColumn } from './types'

export type RowsShared = {
  columns: readonly RecordTableColumn[]
  layout: ColumnLayout
  title: RecordTableColumn | undefined
  timeZone: string
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  getRowHref?: (row: object) => string | undefined
  /** Every cell in a row, for a range error spanning them. */
  columnCount: number
}

export type RecordTableRowsProps = RowsShared & {
  rows: readonly RecordsRow<object>[]
  /** One-based index of the first row, counting the header, when the table holds only some of its rows. */
  firstIndex?: number
  /** Range mode: rows render windowed at their index, with placeholders for gaps. */
  range?: RecordsRangeState
  /** Range mode: the first row on screen, from the position. */
  row?: number
  /** Range mode: reports the first row on screen as the reader scrolls. */
  onRow?: (row: number) => void
}

function Row({
  shared,
  row,
  rowIndex
}: {
  shared: RowsShared
  row: RecordsRow<object>
  rowIndex?: number
}) {
  return (
    <RecordTableRow
      id={row.id}
      record={row.row}
      columns={shared.columns}
      layout={shared.layout}
      title={shared.title}
      timeZone={shared.timeZone}
      selected={shared.isSelected?.(row.id)}
      onToggle={shared.onToggle}
      rowActions={shared.rowActions}
      href={shared.getRowHref?.(row.row)}
      rowIndex={rowIndex}
    />
  )
}

export function RecordTableRows({
  rows,
  firstIndex,
  range,
  row,
  onRow,
  ...shared
}: RecordTableRowsProps) {
  if (range)
    return (
      <RangeRows range={range} row={row ?? 0} onRow={onRow} shared={shared} />
    )
  if (rows.length > VIRTUALISE_AFTER)
    return <VirtualRows rows={rows} firstIndex={firstIndex} shared={shared} />
  return (
    <div role='rowgroup' data-slot='record-table-body'>
      {rows.map((record, index) => (
        <Row
          key={record.id}
          shared={shared}
          row={record}
          rowIndex={firstIndex === undefined ? undefined : firstIndex + index}
        />
      ))}
    </div>
  )
}

function VirtualRows({
  rows,
  firstIndex = 2,
  shared
}: {
  rows: readonly RecordsRow<object>[]
  firstIndex?: number
  shared: RowsShared
}) {
  const getItemKey = useCallback((index: number) => rows[index]!.id, [rows])
  const { bodyRef, view } = useRowWindow({
    count: rows.length,
    getItemKey
  })
  const { cells, padding } = recordsWindow(view, { rows })
  return (
    <WindowBody bodyRef={bodyRef} padding={padding}>
      {cells.map(({ key, index, record }) => (
        <Row
          key={key}
          shared={shared}
          row={record!}
          rowIndex={firstIndex + index}
        />
      ))}
    </WindowBody>
  )
}

function RangeRows({
  range,
  row,
  onRow,
  shared
}: {
  range: RecordsRangeState
  row: number
  onRow?: (row: number) => void
  shared: RowsShared
}) {
  const { bodyRef, view } = useRangeWindow({
    range,
    row,
    onRow
  })
  const { cells, padding } = recordsWindow(view, { range })
  return (
    <WindowBody bodyRef={bodyRef} padding={padding}>
      {cells.map(({ key, index, record, failed }) => {
        const rowIndex = index + 2
        if (failed === 'error')
          return (
            <RecordTableRangeError
              key={key}
              rowIndex={rowIndex}
              columns={shared.columnCount}
            />
          )
        return record ? (
          <Row key={key} shared={shared} row={record} rowIndex={rowIndex} />
        ) : (
          <RecordTableSkeletonRow
            key={key}
            columns={shared.columns}
            layout={shared.layout}
            select={shared.isSelected !== undefined}
            actions={shared.rowActions !== undefined}
            rowIndex={rowIndex}
            blank={failed === 'blank'}
          />
        )
      })}
    </WindowBody>
  )
}

function WindowBody({
  bodyRef,
  padding,
  children
}: {
  bodyRef: RefObject<HTMLDivElement | null>
  padding: WindowPadding
  children: ReactNode
}) {
  return (
    <div
      ref={bodyRef}
      role='rowgroup'
      data-slot='record-table-body'
      style={padding}
    >
      {children}
    </div>
  )
}
