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
  if (records.range) return <RangeCount className={className} />
  const { page, pageSize } = records.position
  // A page past the end, such as a deep link waiting for its count, reads and
  // steps as the last page.
  const shownPage = Math.min(page, records.pageCount - 1)
  const sizeOptions = pageSizes.includes(pageSize)
    ? pageSizes
    : [...pageSizes, pageSize].sort((a, b) => a - b)
  const awaiting =
    records.loading && !records.error && records.rows.length === 0
  const total = awaiting ? 0 : records.resultCount
  const first = total === 0 ? 0 : shownPage * pageSize + 1
  const last = Math.min(total, (shownPage + 1) * pageSize)
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
            {/* Reserves the widest label so the width holds; slack goes first. */}
            <span className='grid tabular-nums'>
              <span aria-hidden className='invisible [grid-area:1/1]'>
                {`${Math.max(...sizeOptions)} per page`}
              </span>
              <Select.Value className='justify-self-end [grid-area:1/1]' />
            </span>
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
          disabled={awaiting || shownPage === 0}
          onClick={() => records.setPage(shownPage - 1)}
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

/** A range list scrolls instead of paging, so its footer is the count. */
function RangeCount({ className }: { className?: string }) {
  const { records } = useRecordsContext()
  const known = records.range?.total
  const shown = known ?? records.resultCount
  const { one, other } = records.recordName
  if (known === undefined && shown === 0) return null
  return (
    <p
      data-slot='records-pagination'
      className={cn('text-sm text-subtle', className)}
    >
      {known === undefined
        ? `${count.format(shown)}+ ${other}`
        : `${count.format(shown)} ${shown === 1 ? one : other}`}
    </p>
  )
}
