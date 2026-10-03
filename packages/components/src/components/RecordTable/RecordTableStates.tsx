import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Skeleton } from '../Skeleton'
import { cellClass, pinStyle, rowClass } from './RecordTableRow'
import type { ColumnLayout } from './layout'
import type { RecordTableColumn } from './types'

const SKELETON_ROWS = 8

/** A state in place of the rows. */
export function StateRow({ children }: { children: ReactNode }) {
  return (
    <div role='rowgroup'>
      <div role='row' className='block'>
        <div role='cell' className='block'>
          {children}
        </div>
      </div>
    </div>
  )
}

export function RecordTableSkeletonRows({
  columns,
  layout,
  size
}: {
  columns: readonly RecordTableColumn[]
  layout: ColumnLayout
  size: number
}) {
  return (
    <div role='rowgroup' aria-hidden data-slot='record-table-skeleton'>
      {Array.from({ length: Math.min(size, SKELETON_ROWS) }, (_, row) => (
        <div
          key={row}
          role='row'
          className={cn(rowClass, 'h-12 border-b border-subtler')}
        >
          {columns.map((column, index) => (
            <div
              key={column.key}
              role='cell'
              className={cellClass(column)}
              style={pinStyle(layout.pinnedStart[index])}
            >
              <Skeleton shape='text' className='animate-none' />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
