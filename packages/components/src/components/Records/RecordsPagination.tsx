'use client'

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button'
import { Select } from '../Select'
import { useRecordsContext } from './context'

const count = new Intl.NumberFormat('en-AU')

export type RecordsPaginationProps = {
  /** @default [25, 50, 100] */
  pageSizes?: number[]
  className?: string
}

export function RecordsPagination({
  pageSizes = [25, 50, 100],
  className
}: RecordsPaginationProps) {
  const { records } = useRecordsContext()
  const { page, pageSize } = records.position
  const sizeOptions = pageSizes.includes(pageSize)
    ? pageSizes
    : [...pageSizes, pageSize].sort((a, b) => a - b)
  const awaiting =
    records.loading && !records.error && records.rows.length === 0
  const total = awaiting ? 0 : records.resultCount
  const first = total === 0 ? 0 : page * pageSize + 1
  const last = Math.min(total, (page + 1) * pageSize)
  return (
    <div
      data-slot='records-pagination'
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 text-sm text-subtle',
        className
      )}
    >
      <p>
        {total === 0
          ? '0 results'
          : `${count.format(first)}–${count.format(last)} of ${count.format(total)}`}
      </p>
      <div className='flex items-center gap-2'>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => records.setPageSize(Number(value))}
        >
          <Select.Trigger
            aria-label='Rows per page'
            size='sm'
            emphasis='subtler'
          >
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {sizeOptions.map((option) => (
              <Select.Item
                key={option}
                value={String(option)}
              >{`${option} per page`}</Select.Item>
            ))}
          </Select.Content>
        </Select>
        <IconButton
          aria-label='Previous page'
          size='sm'
          emphasis='subtler'
          disabled={awaiting || page === 0}
          onClick={() => records.setPage(page - 1)}
        >
          <CaretLeftIcon weight='bold' className='size-4' aria-hidden />
        </IconButton>
        <IconButton
          aria-label='Next page'
          size='sm'
          emphasis='subtler'
          disabled={awaiting || page >= records.pageCount - 1}
          onClick={() => records.setPage(page + 1)}
        >
          <CaretRightIcon weight='bold' className='size-4' aria-hidden />
        </IconButton>
      </div>
    </div>
  )
}
RecordsPagination.displayName = 'Records.Pagination'
