import { type ReactNode, memo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Skeleton } from '../Skeleton'
import {
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass
} from './RecordTableRow'
import type { ColumnLayout } from './layout'
import { useKeepFocusInTable } from './tableFocus'
import type { RecordTableColumn } from './types'

const SKELETON_ROWS = 8

/** A state in place of the rows. */
export function StateRow({
  columns,
  children
}: {
  columns: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Retry or Clear replaces the state, and its button with it.
  useKeepFocusInTable(ref)
  return (
    <div ref={ref} role='rowgroup'>
      <div role='row' className='block'>
        <div role='cell' aria-colspan={columns} className='block'>
          {children}
        </div>
      </div>
    </div>
  )
}

type SkeletonRowProps = {
  columns: readonly RecordTableColumn[]
  layout: ColumnLayout
  /** The checkbox and row actions tracks, kept empty so cells stay in their columns. */
  select: boolean
  actions: boolean
}

/** One row of grey bars; static, as a shimmer would repaint every one each scroll frame. */
export const RecordTableSkeletonRow = memo(function RecordTableSkeletonRow({
  columns,
  layout,
  select,
  actions,
  rowIndex,
  blank = false
}: SkeletonRowProps & {
  /** One-based, counting the header row, when the table holds only some of its rows. */
  rowIndex?: number
  /** No bars: a row of a failed range, which isn't loading. */
  blank?: boolean
}) {
  return (
    <div
      role='row'
      aria-hidden
      aria-rowindex={rowIndex}
      data-slot='record-table-placeholder-row'
      className={cn(rowClass, 'h-12 border-b border-subtler')}
    >
      {select && <div role='cell' className={selectCellClass} />}
      {columns.map((column, index) => (
        <div
          key={column.key}
          role='cell'
          className={cellClass(column)}
          style={pinStyle(layout.pinnedStart[index])}
        >
          {!blank && <Skeleton shape='text' className='animate-none' />}
        </div>
      ))}
      {actions && <div role='cell' className={actionsCellClass} />}
    </div>
  )
})

export function RecordTableSkeletonRows({
  size,
  ...row
}: SkeletonRowProps & { size: number }) {
  return (
    <div role='rowgroup' aria-hidden data-slot='record-table-skeleton'>
      {Array.from({ length: Math.min(size, SKELETON_ROWS) }, (_, index) => (
        <RecordTableSkeletonRow key={index} {...row} />
      ))}
    </div>
  )
}
