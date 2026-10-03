'use client'

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useState
} from 'react'

import type { RecordsRange, RecordsRow } from '../Records/types'
import {
  RecordTableRangeError,
  failedRowAt,
  rangeErrorKey
} from './RecordTableRangeError'
import { RecordTableRow } from './RecordTableRow'
import { RecordTableSkeletonRow } from './RecordTableStates'
import type { ColumnLayout } from './layout'
import {
  rowPosition,
  stuckInset,
  useRowReport,
  useRowRestore
} from './rowPosition'
import { useRowWindow } from './rowWindow'
import type { RecordTableColumn } from './types'

/** Past this many rows, only those near the screen render. */
export const VIRTUALISE_AFTER = 100

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
  range?: RecordsRange
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
  const { bodyRef, items, total, margin } = useRowWindow({
    count: rows.length,
    getItemKey
  })
  return (
    <WindowBody bodyRef={bodyRef} items={items} total={total} margin={margin}>
      {items.map((item) => (
        <Row
          key={rows[item.index]!.id}
          shared={shared}
          row={rows[item.index]!}
          rowIndex={firstIndex + item.index}
        />
      ))}
    </WindowBody>
  )
}

// Range rows key by index: ids would change the key function on every load.
const indexKey = (index: number) => `@${index}`

/** Range mode's window: reports the first row on screen, restores `row`, and asks for the ranges in view. */
function useRangeWindow({
  range,
  row,
  onRow
}: {
  range: RecordsRange
  row: number
  onRow?: (row: number) => void
}) {
  const { rowAt, view, count, total: rowTotal, loading } = range
  const loaded = useCallback(
    (index: number) => rowAt(index) !== undefined,
    [rowAt]
  )
  const [position] = useState(rowPosition)
  const onChange = useRowReport({
    position,
    onRow: (next) => onRow?.(next)
  })
  const {
    bodyRef,
    virtualizer,
    items,
    total,
    visible,
    firstClear,
    margin,
    inset,
    scrollElement,
    measured
  } = useRowWindow({
    count,
    getItemKey: indexKey,
    onChange,
    measureInset: stuckInset
  })
  const first = visible?.startIndex
  const last = visible?.endIndex
  // A layout effect, before the plan below, so a first plan knows its target.
  const plan = useRowRestore({
    virtualizer,
    measured,
    scrollElement,
    query: range.key,
    row,
    total: rowTotal,
    loaded,
    inset,
    margin,
    position,
    view
  })
  // Loading is a dep so a settled range plans again; row, so a new target
  // does; the key, so a new query plans even when the window hasn't moved.
  useEffect(() => {
    if (measured && first !== undefined && last !== undefined) plan(first, last)
  }, [measured, first, last, count, loading, row, range.key, plan])
  return { bodyRef, items, total, margin, first: firstClear ?? first }
}

function RangeRows({
  range,
  row,
  onRow,
  shared
}: {
  range: RecordsRange
  row: number
  onRow?: (row: number) => void
  shared: RowsShared
}) {
  const { bodyRef, items, total, margin, first } = useRangeWindow({
    range,
    row,
    onRow
  })
  return (
    <WindowBody bodyRef={bodyRef} items={items} total={total} margin={margin}>
      {items.map((item) => {
        const rowIndex = item.index + 2
        const held = range.rowAt(item.index)
        const failed = held ? undefined : failedRowAt(range, item.index, first)
        if (failed?.error)
          return (
            <RecordTableRangeError
              key={rangeErrorKey(failed.start)}
              rowIndex={rowIndex}
              columns={shared.columnCount}
            />
          )
        return held ? (
          // By index: a shifting offset API can return one id twice.
          <Row
            key={indexKey(item.index)}
            shared={shared}
            row={held}
            rowIndex={rowIndex}
          />
        ) : (
          <RecordTableSkeletonRow
            key={indexKey(item.index)}
            columns={shared.columns}
            layout={shared.layout}
            select={shared.isSelected !== undefined}
            actions={shared.rowActions !== undefined}
            rowIndex={rowIndex}
            blank={failed !== undefined}
          />
        )
      })}
    </WindowBody>
  )
}

type WindowItem = { index: number; start: number; end: number }

/** The space above and below the rendered rows, standing in for the rest. */
export function windowPadding(
  items: readonly WindowItem[],
  total: number,
  margin: number
) {
  return {
    paddingBlockStart: items.length ? items[0]!.start - margin : 0,
    paddingBlockEnd: items.length ? total - (items.at(-1)!.end - margin) : 0,
    // React removes swapped rows before inserting their replacements, and
    // WebKit clamps the scroll to the shorter body in between.
    minBlockSize: total
  }
}

function WindowBody({
  bodyRef,
  items,
  total,
  margin,
  children
}: {
  bodyRef: RefObject<HTMLDivElement | null>
  items: readonly WindowItem[]
  total: number
  margin: number
  children: ReactNode
}) {
  return (
    <div
      ref={bodyRef}
      role='rowgroup'
      data-slot='record-table-body'
      style={windowPadding(items, total, margin)}
    >
      {children}
    </div>
  )
}
